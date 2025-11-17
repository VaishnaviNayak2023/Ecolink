<?php
header('Content-Type: application/json');

// Database config
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "ecolink_db";

// Connect
$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "DB connection failed"]);
    exit;
}

$mode = $_POST['mode'] ?? null;

if (!$mode) {
    echo json_encode(["success" => false, "message" => "Mode not specified"]);
    exit;
}

/* --------------------------
   REGISTER
-------------------------- */
if ($mode === "register") {

    $role = $_POST['role'] ?? "";
    $full_name = $_POST['full_name'] ?? "";
    $email = $_POST['email'] ?? "";
    $phone = $_POST['phone'] ?? "";
    $pass = $_POST['password'] ?? "";

    if (!$role || !$full_name || !$email || !$phone || !$pass) {
        echo json_encode(["success" => false, "message" => "Missing fields"]);
        exit;
    }

    // Check if email exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email=?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        echo json_encode(["success" => false, "message" => "Email already registered"]);
        exit;
    }
    $stmt->close();

    // Hash password
    $hashed_pass = password_hash($pass, PASSWORD_DEFAULT);

    $stmt = $conn->prepare("INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $full_name, $email, $phone, $hashed_pass, $role);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Registration successful"]);
    } else {
        echo json_encode(["success" => false, "message" => "Registration failed"]);
    }
    exit;
}

/* --------------------------
   LOGIN
-------------------------- */
if ($mode === "login") {

    $email = $_POST['email'] ?? "";
    $pass = $_POST['password'] ?? "";
    $role = $_POST['role'] ?? "";

    if (!$email || !$pass || !$role) {
        echo json_encode(["success" => false, "message" => "Missing login fields"]);
        exit;
    }

    $stmt = $conn->prepare("SELECT id, full_name, password, role FROM users WHERE email=? AND role=?");
    $stmt->bind_param("ss", $email, $role);
    $stmt->execute();
    $stmt->store_result();
    $stmt->bind_result($id, $full_name, $hashed_pass, $db_role);

    if ($stmt->num_rows === 1) {
        $stmt->fetch();

        if (password_verify($pass, $hashed_pass)) {
            session_start();
            $_SESSION['user_id'] = $id;
            $_SESSION['full_name'] = $full_name;
            $_SESSION['role'] = $db_role;

            echo json_encode([
                "success" => true,
                "message" => "Welcome",
                "username" => $full_name
            ]);
        } else {
            echo json_encode(["success" => false, "message" => "Incorrect password"]);
        }

    } else {
        echo json_encode(["success" => false, "message" => "No account found"]);
    }
    exit;
}

/* --------------------------
   INVALID MODE
-------------------------- */
echo json_encode(["success" => false, "message" => "Invalid request"]);
exit;
?>
