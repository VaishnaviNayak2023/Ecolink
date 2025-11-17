<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$host = "localhost";
$user = "root";     // Default XAMPP user
$pass = "";         // Default XAMPP password (often empty)
$dbname = "ecoreport";

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    // Return connection error if database setup failed
    die(json_encode(["success" => false, "message" => "Database connection failed: " . $conn->connect_error]));
}

$action = $_GET['action'] ?? '';

// ROUTES
switch ($action) {

    // GET INCIDENTS FROM DB
    case "get_incidents":
        // Ensure column names match your SQL table definitions
        $sql = "SELECT incident_code, type, location, severity, status, date FROM incidents ORDER BY date DESC";
        $res = $conn->query($sql);

        $data = [];
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $data[] = [
                    "id" => $row["incident_code"],
                    "type" => $row["type"],
                    "location" => $row["location"],
                    "severity" => $row["severity"],
                    "status" => $row["status"],
                    "date" => $row["date"]
                ];
            }
        }

        echo json_encode(["success" => true, "data" => $data]);
        break;


    // GET USERS FROM DB
    case "get_users":
        // Ensure column names match your SQL table definitions
        $sql = "SELECT user_code, name, email, role, last_login, status FROM users ORDER BY id DESC";
        $res = $conn->query($sql);

        $data = [];
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $data[] = [
                    "id" => $row["user_code"],
                    "name" => $row["name"],
                    "email" => $row["email"],
                    "role" => $row["role"],
                    "last_login" => $row["last_login"],
                    "status" => $row["status"]
                    // Note: Avatar fetching is complex (requires path/storage), omitted here
                ];
            }
        }

        echo json_encode(["success" => true, "data" => $data]);
        break;


    default:
        echo json_encode(["success" => false, "message" => "Invalid API action"]);
}

$conn->close();
?>