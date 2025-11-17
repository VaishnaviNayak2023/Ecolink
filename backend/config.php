<?php
// config.php — Centralized configuration supporting multiple databases
// Works with XAMPP (default MySQL user: root, password: '')

// ===== Database Settings =====
$DBS = [
    'quickreport' => [
        'host' => '127.0.0.1',
        'user' => 'root',
        'pass' => '',
        'name' => 'quickreport_db'
    ],
    'ecolink' => [
        'host' => '127.0.0.1',
        'user' => 'root',
        'pass' => '',
        'name' => 'ecolink_db'
    ]
];

// ===== File Upload Settings =====
define('UPLOAD_DIR', __DIR__ . '/../uploads'); // Create this folder
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB per file

// ===== Allowed File Types =====
$ALLOWED_MIMES = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'video/mp4',
    'video/quicktime'
];

// ===== Database Connection Function =====
function db_connect($which = 'quickreport') {
    global $DBS;

    if (!isset($DBS[$which])) {
        http_response_code(500);
        die(json_encode(['error' => "Unknown database key: $which"]));
    }

    $conf = $DBS[$which];
    $mysqli = new mysqli($conf['host'], $conf['user'], $conf['pass'], $conf['name']);

    if ($mysqli->connect_errno) {
        http_response_code(500);
        die(json_encode(['error' => 'Database connection failed: ' . $mysqli->connect_error]));
    }

    $mysqli->set_charset('utf8mb4');
    return $mysqli;
}
?>
