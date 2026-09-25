<?php
declare(strict_types=1);

header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $value): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($value, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR);
    exit;
}
function reject(int $status, string $message): never { throw new RuntimeException($message, $status); }
function input(int $limit): string {
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > $limit) reject(413, 'Request is too large.');
    $body = file_get_contents('php://input', false, null, 0, $limit + 1);
    if ($body === false || strlen($body) > $limit) reject(413, 'Request is too large.');
    return $body;
}
function jsonInput(): array {
    try { $value = json_decode(input(8 * 1024 * 1024), true, 512, JSON_THROW_ON_ERROR); }
    catch (JsonException $e) { reject(400, 'Invalid JSON.'); }
    if (!is_array($value) || array_is_list($value)) reject(400, 'Expected a JSON object.');
    return $value;
}
function obj($value): bool { return is_array($value) && !array_is_list($value); }
function jsonObject($value): bool { return is_array($value) && ($value === [] || !array_is_list($value)); }
function dateValid($value): bool {
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value)) return false;
    [$year, $month, $day] = array_map('intval', explode('-', $value));
    return checkdate($month, $day, $year);
}
function idValid($value): bool { return is_string($value) && (bool) preg_match('/^[A-Za-z0-9._-]{1,191}$/D', $value); }
function finiteOrNull($value): bool { return $value === null || (is_int($value) || is_float($value)) && is_finite((float) $value); }
function nullableNumber(array $value, string $key) { return $value[$key] ?? null; }
function arrayList($value): bool { return is_array($value) && array_is_list($value); }
function validDay(array $day): bool {
    return dateValid($day['date'] ?? null)
        && in_array($day['gym'] ?? null, [null, 'completed', 'rest', 'missed'], true)
        && in_array($day['diet'] ?? null, [null, 'followed', 'cheat_meal', 'cheat_day', 'missed'], true)
        && finiteOrNull($day['weightKg'] ?? null) && finiteOrNull($day['energy'] ?? null)
        && finiteOrNull($day['sleepHours'] ?? null) && finiteOrNull($day['waterLiters'] ?? null)
        && finiteOrNull($day['steps'] ?? null);
}
function validSettings($settings): bool {
    return obj($settings) && in_array($settings['theme'] ?? null, ['dark', 'light'], true)
        && in_array($settings['language'] ?? null, ['en', 'ar'], true)
        && in_array($settings['weightUnit'] ?? null, ['kg', 'lb'], true)
        && in_array($settings['lengthUnit'] ?? null, ['cm', 'in'], true)
        && in_array($settings['weekStart'] ?? null, [0, 1], true)
        && in_array($settings['heatmapMode'] ?? null, ['gym', 'diet', 'overall', 'weight'], true)
        && arrayList($settings['workoutTypes'] ?? null)
        && arrayList($settings['hiddenModules'] ?? null)
        && obj($settings['optionalFields'] ?? null);
}
function validExercise($item): bool { return obj($item) && idValid($item['id'] ?? null) && is_string($item['name'] ?? null) && is_bool($item['weighted'] ?? null); }
function validWorkout($item, ?array $exerciseIds = null): bool {
    if (!obj($item) || !idValid($item['id'] ?? null) || !dateValid($item['date'] ?? null) || !is_string($item['type'] ?? null) || !arrayList($item['exercises'] ?? null)) return false;
    foreach ($item['exercises'] as $entry) {
        if (!obj($entry) || !idValid($entry['exerciseId'] ?? null) || !arrayList($entry['sets'] ?? null)) return false;
        if ($exerciseIds !== null && !isset($exerciseIds[$entry['exerciseId']])) return false;
        foreach ($entry['sets'] as $set) if (!obj($set) || !is_int($set['reps'] ?? null) || $set['reps'] < 1 || !finiteOrNull($set['weightKg'] ?? null)) return false;
    }
    return true;
}
function validMeasurement($item): bool { return obj($item) && idValid($item['id'] ?? null) && dateValid($item['date'] ?? null) && jsonObject($item['values'] ?? null) && jsonObject($item['custom'] ?? null); }
function validPhoto($item): bool {
    return obj($item) && idValid($item['id'] ?? null) && dateValid($item['date'] ?? null)
        && in_array($item['category'] ?? null, ['Front', 'Side', 'Back', 'Other'], true)
        && in_array($item['mimeType'] ?? null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)
        && finiteOrNull($item['weightKg'] ?? null) && finiteOrNull($item['bodyFat'] ?? null);
}
function validData($data): bool {
    if (!obj($data) || !validSettings($data['settings'] ?? null)) return false;
    foreach (['days', 'workouts', 'exercises', 'measurements', 'photos'] as $key) if (!arrayList($data[$key] ?? null)) return false;
    foreach ($data['days'] as $item) if (!obj($item) || !validDay($item)) return false;
    foreach ($data['exercises'] as $item) if (!validExercise($item)) return false;
    $exerciseIds = array_fill_keys(array_column($data['exercises'], 'id'), true);
    foreach ($data['workouts'] as $item) if (!validWorkout($item, $exerciseIds)) return false;
    foreach ($data['measurements'] as $item) if (!validMeasurement($item)) return false;
    foreach ($data['photos'] as $item) if (!validPhoto($item)) return false;
    foreach (['days' => 'date', 'workouts' => 'id', 'exercises' => 'id', 'measurements' => 'id', 'photos' => 'id'] as $collection => $key) {
        $keys = array_column($data[$collection], $key);
        if (count($keys) !== count(array_unique($keys))) return false;
    }
    return true;
}
function db(): PDO {
    $config = ['host' => '127.0.0.1', 'port' => 3306, 'database' => 'fitlog', 'user' => 'root', 'password' => ''];
    $local = __DIR__ . '/config.local.php';
    if (is_file($local)) {
        ob_start();
        try { $overrides = require $local; }
        finally { ob_end_clean(); }
        if (!is_array($overrides)) reject(500, 'Invalid local database configuration.');
        $config = array_merge($config, $overrides);
    }
    $GLOBALS['dbConfig'] = $config;
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['host'], (int) $config['port'], $config['database']);
    return new PDO($dsn, $config['user'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]);
}
function photosDir(): string {
    $documentRoot = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $_SERVER['DOCUMENT_ROOT'] ?? dirname(__DIR__));
    $root = dirname(rtrim($documentRoot, '\\/'));
    $folder = $root . DIRECTORY_SEPARATOR . 'FitLog-data' . DIRECTORY_SEPARATOR . 'photos';
    if (!is_dir($folder) && !mkdir($folder, 0700, true) && !is_dir($folder)) reject(500, 'Could not create the local photos folder.');
    return $folder;
}
function one(PDO $db, string $sql, array $args = []) {
    $query = $db->prepare($sql); $query->execute($args); return $query->fetch();
}
function all(PDO $db, string $sql, array $args = []): array {
    $query = $db->prepare($sql); $query->execute($args); return $query->fetchAll();
}
function run(PDO $db, string $sql, array $args = []): int {
    $query = $db->prepare($sql); $query->execute($args); return $query->rowCount();
}
function blank(PDO $db): bool {
    $row = one($db, 'SELECT (SELECT COUNT(*) FROM days)+(SELECT COUNT(*) FROM workouts)+(SELECT COUNT(*) FROM exercises)+(SELECT COUNT(*) FROM measurements)+(SELECT COUNT(*) FROM photos) AS total');
    return (int) $row['total'] === 0;
}
function defaultSettings(): array {
    return ['theme'=>'dark','language'=>'en','weightUnit'=>'kg','lengthUnit'=>'cm','weekStart'=>1,'weeklyGymGoal'=>4,'monthlyGymGoal'=>16,'dietGoal'=>85,'heatmapMode'=>'overall','heatmapYear'=>(int) date('Y'),'optionalFields'=>['energy'=>true,'sleep'=>true,'water'=>true,'steps'=>true,'photo'=>true],'hiddenModules'=>[],'workoutTypes'=>['Push','Pull','Legs','Upper','Lower','Full Body']];
}
function writeDay(PDO $db, array $v): void {
    run($db, 'INSERT INTO days(date,gym,diet,weight_kg,notes,energy,sleep_hours,water_liters,steps) VALUES(?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE gym=VALUES(gym),diet=VALUES(diet),weight_kg=VALUES(weight_kg),notes=VALUES(notes),energy=VALUES(energy),sleep_hours=VALUES(sleep_hours),water_liters=VALUES(water_liters),steps=VALUES(steps)', [$v['date'],$v['gym'] ?? null,$v['diet'] ?? null,$v['weightKg'] ?? null,$v['notes'] ?? null,$v['energy'] ?? null,$v['sleepHours'] ?? null,$v['waterLiters'] ?? null,$v['steps'] ?? null]);
}
function writeExercise(PDO $db, array $v): void {
    run($db, 'INSERT INTO exercises(id,name,weighted,notes) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),weighted=VALUES(weighted),notes=VALUES(notes)', [$v['id'],$v['name'],$v['weighted'] ? 1 : 0,$v['notes'] ?? null]);
}
function writeWorkout(PDO $db, array $v): void {
    run($db, 'INSERT INTO workouts(id,date,type,duration_minutes,quality,notes) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE date=VALUES(date),type=VALUES(type),duration_minutes=VALUES(duration_minutes),quality=VALUES(quality),notes=VALUES(notes)', [$v['id'],$v['date'],$v['type'],$v['durationMinutes'] ?? null,$v['quality'] ?? null,$v['notes'] ?? null]);
    run($db, 'DELETE FROM workout_exercises WHERE workout_id=?', [$v['id']]);
    foreach ($v['exercises'] as $position => $entry) {
        run($db, 'INSERT INTO workout_exercises(workout_id,exercise_id,position) VALUES(?,?,?)', [$v['id'],$entry['exerciseId'],$position]);
        foreach ($entry['sets'] as $number => $set) run($db, 'INSERT INTO workout_sets(workout_id,exercise_position,set_number,reps,weight_kg) VALUES(?,?,?,?,?)', [$v['id'],$position,$number + 1,$set['reps'],$set['weightKg'] ?? null]);
    }
}
function writeMeasurement(PDO $db, array $v): void {
    run($db, 'INSERT INTO measurements(id,date,values_json,custom_json,notes) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE date=VALUES(date),values_json=VALUES(values_json),custom_json=VALUES(custom_json),notes=VALUES(notes)', [$v['id'],$v['date'],json_encode($v['values'], JSON_THROW_ON_ERROR),json_encode($v['custom'], JSON_THROW_ON_ERROR),$v['notes'] ?? null]);
}
function writePhoto(PDO $db, array $v, string $file): void {
    run($db, 'INSERT INTO photos(id,date,category,weight_kg,body_fat,notes,mime_type,file_name) VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE date=VALUES(date),category=VALUES(category),weight_kg=VALUES(weight_kg),body_fat=VALUES(body_fat),notes=VALUES(notes),mime_type=VALUES(mime_type),file_name=VALUES(file_name)', [$v['id'],$v['date'],$v['category'],$v['weightKg'] ?? null,$v['bodyFat'] ?? null,$v['notes'] ?? null,$v['mimeType'],$file]);
}
function writeSettings(PDO $db, array $v): void {
    run($db, 'INSERT INTO settings(id,data_json) VALUES(1,?) ON DUPLICATE KEY UPDATE data_json=VALUES(data_json)', [json_encode($v, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
}
function load(PDO $db): array {
    $days = array_map(function ($r) {
        $v = ['date'=>$r['date'],'gym'=>$r['gym'],'diet'=>$r['diet']];
        foreach (['weight_kg'=>'weightKg','notes'=>'notes','energy'=>'energy','sleep_hours'=>'sleepHours','water_liters'=>'waterLiters','steps'=>'steps'] as $column=>$key) if ($r[$column] !== null) $v[$key] = $column === 'notes' ? $r[$column] : (float) $r[$column];
        return $v;
    }, all($db, 'SELECT * FROM days ORDER BY date'));
    $exercises = array_map(fn($r) => ['id'=>$r['id'],'name'=>$r['name'],'weighted'=>(bool)$r['weighted'],'notes'=>$r['notes']], all($db, 'SELECT * FROM exercises ORDER BY name'));
    $workouts = [];
    foreach (all($db, 'SELECT * FROM workouts ORDER BY date') as $r) {
        $entries = [];
        foreach (all($db, 'SELECT exercise_id,position FROM workout_exercises WHERE workout_id=? ORDER BY position', [$r['id']]) as $entry) {
            $sets = array_map(function ($s) { $v = ['reps'=>(int)$s['reps']]; if ($s['weight_kg'] !== null) $v['weightKg'] = (float)$s['weight_kg']; return $v; }, all($db, 'SELECT reps,weight_kg FROM workout_sets WHERE workout_id=? AND exercise_position=? ORDER BY set_number', [$r['id'],$entry['position']]));
            $entries[] = ['exerciseId'=>$entry['exercise_id'],'sets'=>$sets];
        }
        $workout = ['id'=>$r['id'],'date'=>$r['date'],'type'=>$r['type'],'exercises'=>$entries];
        if ($r['duration_minutes'] !== null) $workout['durationMinutes'] = (int)$r['duration_minutes'];
        if ($r['quality'] !== null) $workout['quality'] = (int)$r['quality'];
        if ($r['notes'] !== null) $workout['notes'] = $r['notes'];
        $workouts[] = $workout;
    }
    $measurements = array_map(fn($r) => ['id'=>$r['id'],'date'=>$r['date'],'values'=>json_decode($r['values_json'], true) ?: (object) [],'custom'=>json_decode($r['custom_json'], true) ?: (object) [],'notes'=>$r['notes']], all($db, 'SELECT * FROM measurements ORDER BY date'));
    $photos = array_map(function ($r) { $v = ['id'=>$r['id'],'date'=>$r['date'],'category'=>$r['category'],'mimeType'=>$r['mime_type']]; if ($r['weight_kg'] !== null) $v['weightKg'] = (float)$r['weight_kg']; if ($r['body_fat'] !== null) $v['bodyFat'] = (float)$r['body_fat']; if ($r['notes'] !== null) $v['notes'] = $r['notes']; return $v; }, all($db, 'SELECT id,date,category,weight_kg,body_fat,notes,mime_type FROM photos ORDER BY date'));
    $settings = one($db, 'SELECT data_json FROM settings WHERE id=1');
    return compact('days','workouts','exercises','measurements','photos') + ['settings'=>$settings ? json_decode($settings['data_json'], true) : defaultSettings()];
}
function replaceData(PDO $db, array $data, array $files, bool $onlyIfEmpty): void {
    $db->beginTransaction();
    try {
        if ($onlyIfEmpty && !blank($db)) reject(409, 'The MySQL database already contains data.');
        foreach (['workout_sets','workout_exercises','workouts','days','exercises','measurements','photos','settings'] as $table) $db->exec('DELETE FROM ' . $table);
        foreach ($data['exercises'] as $v) writeExercise($db, $v);
        foreach ($data['days'] as $v) writeDay($db, $v);
        foreach ($data['workouts'] as $v) writeWorkout($db, $v);
        foreach ($data['measurements'] as $v) writeMeasurement($db, $v);
        foreach ($data['photos'] as $v) writePhoto($db, $v, $files[$v['id']]);
        writeSettings($db, $data['settings']);
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }
}
function mimeValid(string $bytes, string $expected): bool {
    $actual = (new finfo(FILEINFO_MIME_TYPE))->buffer($bytes);
    return $actual === $expected;
}
function importPayload(PDO $db, bool $onlyIfEmpty): array {
    if ($onlyIfEmpty && !blank($db)) reject(409, 'The MySQL database already contains data.');
    try { $payload = json_decode(input(256 * 1024 * 1024), true, 512, JSON_THROW_ON_ERROR); }
    catch (JsonException $e) { reject(400, 'Backup data is invalid.'); }
    if (!obj($payload) || !validData($payload['data'] ?? null) || !jsonObject($payload['photos'] ?? null)) reject(400, 'Backup data is invalid.');
    $data = $payload['data']; $photos = $payload['photos'];
    $folder = photosDir(); $staged = []; $files = [];
    try {
        foreach ($data['photos'] as $photo) {
            $encoded = $photos[$photo['id']] ?? null;
            $content = is_string($encoded) ? base64_decode($encoded, true) : false;
            if ($content === false || strlen($content) < 1 || strlen($content) > 80 * 1024 * 1024 || !mimeValid($content, $photo['mimeType'])) reject(400, 'A backup photo is missing or invalid.');
            $extension = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','image/gif'=>'gif'][$photo['mimeType']];
            $name = bin2hex(random_bytes(16)) . '.' . $extension;
            $path = $folder . DIRECTORY_SEPARATOR . $name;
            if (file_put_contents($path, $content, LOCK_EX) === false) reject(500, 'Could not save a backup photo.');
            $staged[] = $path; $files[$photo['id']] = $name;
        }
        $old = array_column(all($db, 'SELECT file_name FROM photos'), 'file_name');
        replaceData($db, $data, $files, $onlyIfEmpty);
        foreach ($old as $name) if (!in_array($name, $files, true)) @unlink($folder . DIRECTORY_SEPARATOR . $name);
        return ['imported'=>true,'days'=>count($data['days']),'photos'=>count($data['photos'])];
    } catch (Throwable $e) {
        foreach ($staged as $path) @unlink($path);
        throw $e;
    }
}
try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $route = trim((string) ($_GET['route'] ?? ''), '/');
    if ($method !== 'GET' && isset($_SERVER['HTTP_ORIGIN'])) {
        $origin = parse_url($_SERVER['HTTP_ORIGIN']);
        $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
        $originHost = strtolower((string) ($origin['host'] ?? '')) . (isset($origin['port']) ? ':' . $origin['port'] : '');
        if ($originHost !== $host) reject(403, 'Requests must come from this FitLog site.');
    }
    $db = db();
    if ($method === 'GET' && $route === 'status') {
        $config = $GLOBALS['dbConfig'];
        respond(200, ['ok'=>true,'empty'=>blank($db),'databasePath'=>$config['host'] . ':' . $config['port'] . '/' . $config['database'],'photosPath'=>photosDir()]);
    }
    if ($method === 'GET' && $route === 'data') respond(200, load($db));
    if ($method === 'PUT' && $route === 'days') {
        $v = jsonInput(); if (!validDay($v)) reject(400, 'Invalid day log.');
        writeDay($db, $v); respond(200, ['saved'=>true]);
    }
    if ($method === 'PUT' && $route === 'exercises') {
        $v = jsonInput(); if (!validExercise($v)) reject(400, 'Invalid exercise.');
        writeExercise($db, $v); respond(200, ['saved'=>true]);
    }
    if ($method === 'PUT' && $route === 'workouts') {
        $v = jsonInput(); if (!validWorkout($v)) reject(400, 'Invalid workout.');
        $db->beginTransaction();
        try { writeWorkout($db, $v); $db->commit(); }
        catch (Throwable $e) { $db->rollBack(); throw $e; }
        respond(200, ['saved'=>true]);
    }
    if ($method === 'DELETE' && preg_match('~^workouts/([^/]+)$~D', $route, $m)) respond(200, ['deleted'=>run($db, 'DELETE FROM workouts WHERE id=?', [rawurldecode($m[1])]) > 0]);
    if ($method === 'PUT' && $route === 'measurements') {
        $v = jsonInput(); if (!validMeasurement($v)) reject(400, 'Invalid measurement.');
        writeMeasurement($db, $v); respond(200, ['saved'=>true]);
    }
    if ($method === 'DELETE' && preg_match('~^measurements/([^/]+)$~D', $route, $m)) respond(200, ['deleted'=>run($db, 'DELETE FROM measurements WHERE id=?', [rawurldecode($m[1])]) > 0]);
    if ($method === 'PUT' && $route === 'settings') {
        $v = jsonInput(); if (!validSettings($v)) reject(400, 'Invalid settings.');
        writeSettings($db, $v); respond(200, ['saved'=>true]);
    }
    if (preg_match('~^photos/([^/]+)(/blob)?$~D', $route, $m)) {
        $id = rawurldecode($m[1]); if (!idValid($id)) reject(400, 'Invalid photo ID.');
        $old = one($db, 'SELECT file_name,mime_type FROM photos WHERE id=?', [$id]);
        if ($method === 'GET' && ($m[2] ?? '') === '/blob') {
            if (!$old) reject(404, 'Photo not found.');
            $path = photosDir() . DIRECTORY_SEPARATOR . $old['file_name'];
            if (!is_file($path)) reject(404, 'Photo file not found.');
            header('Content-Type: ' . $old['mime_type']); header('Content-Length: ' . filesize($path)); readfile($path); exit;
        }
        if ($method === 'PUT' && !isset($m[2])) {
            $meta = json_decode(rawurldecode($_SERVER['HTTP_X_PHOTO_META'] ?? ''), true);
            if (!validPhoto($meta) || $meta['id'] !== $id) reject(400, 'Invalid photo details.');
            $bytes = input(80 * 1024 * 1024);
            if ($bytes === '' || !mimeValid($bytes, $meta['mimeType'])) reject(400, 'Invalid photo file.');
            $extension = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','image/gif'=>'gif'][$meta['mimeType']];
            $name = bin2hex(random_bytes(16)) . '.' . $extension;
            $path = photosDir() . DIRECTORY_SEPARATOR . $name;
            if (file_put_contents($path, $bytes, LOCK_EX) === false) reject(500, 'Could not save the photo.');
            try { writePhoto($db, $meta, $name); }
            catch (Throwable $e) { @unlink($path); throw $e; }
            if ($old) @unlink(photosDir() . DIRECTORY_SEPARATOR . $old['file_name']);
            respond(200, ['saved'=>true]);
        }
        if ($method === 'DELETE' && !isset($m[2])) {
            $deleted = run($db, 'DELETE FROM photos WHERE id=?', [$id]) > 0;
            if ($old) @unlink(photosDir() . DIRECTORY_SEPARATOR . $old['file_name']);
            respond(200, ['deleted'=>$deleted]);
        }
    }
    if ($method === 'POST' && in_array($route, ['replace','import-legacy'], true)) respond(200, importPayload($db, $route === 'import-legacy'));
    reject(404, 'API route not found.');
} catch (Throwable $e) {
    $status = $e instanceof RuntimeException && $e->getCode() >= 400 && $e->getCode() <= 599 ? $e->getCode() : 500;
    if ($e instanceof PDOException && in_array($e->getCode(), ['42S02','1049'], true)) respond(503, ['error'=>'Import database/fitlog.sql into XAMPP MySQL first.']);
    respond($status, ['error'=>$status === 500 ? 'Local API error. Check PHP and MySQL in XAMPP.' : $e->getMessage()]);
}
