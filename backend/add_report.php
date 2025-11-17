<?php
// 1. Include the database connection file.
// Assumes db_connect.php defines $conn
require_once 'db_connect.php';

// Assuming the user's UserID is stored in a session variable after successful login
// Replace 'SESSION_USER_ID' with the actual session key you use
$generatorID = 'TEMP_GEN_123'; // *** REPLACE THIS WITH ACTUAL SESSION VARIABLE ***
// Example of how you might get it after implementing session login:
// session_start();
// if (!isset($_SESSION['user_id'])) {
//     http_response_code(401);
//     echo json_encode(['success' => false, 'message' => 'User not logged in.']);
//     exit();
// }
// $generatorID = $_SESSION['user_id'];


// 2. Check for a POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // Set headers for JSON response
    header('Content-Type: application/json');

    // --- 3. Sanitize and Validate Input ---
    
    // Required fields from the front-end form
    $reportName = trim($_POST['report_name'] ?? '');
    $format     = trim($_POST['format'] ?? '');
    $category   = trim($_POST['report_category'] ?? '');
    $dateStart  = trim($_POST['date_start'] ?? '');
    $dateEnd    = trim($_POST['date_end'] ?? '');

    // Basic validation
    if (empty($reportName) || empty($format)) {
        http_response_code(400); // Bad Request
        echo json_encode(['success' => false, 'message' => 'Report Name and Format are required.']);
        exit();
    }
    
    // Ensure format is a valid option (based on your schema comment)
    if (!in_array($format, ['PDF', 'CSV', 'XLSX'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid report format specified.']);
        exit();
    }

    // Prepare optional fields for NULL insertion if empty
    $category = !empty($category) ? $category : NULL;
    $dateStart = !empty($dateStart) ? $dateStart : NULL;
    $dateEnd = !empty($dateEnd) ? $dateEnd : NULL;

    // --- 4. Prepare and Execute SQL INSERT Query ---
    
    $sql = "INSERT INTO REPORT (GeneratorID, ReportName, Format, Category, DateRangeStart, DateRangeEnd)
            VALUES (?, ?, ?, ?, ?, ?)";

    // Use prepared statements to prevent SQL injection
    $stmt = $conn->prepare($sql);
    
    // 's' for string, 's' for string, 's' for string, 's' for string, 's' for date, 's' for date
    $stmt->bind_param("ssssss", 
        $generatorID, 
        $reportName, 
        $format, 
        $category, 
        $dateStart, 
        $dateEnd
    );
    
    if ($stmt->execute()) {
        $newReportID = $conn->insert_id;
        echo json_encode([
            'success' => true, 
            'message' => 'Report record created successfully.', 
            'report_id' => $newReportID
        ]);
    } else {
        http_response_code(500); // Internal Server Error
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $stmt->error]);
    }

    $stmt->close();
    
} else {
    // Handle non-POST requests
    http_response_code(405); // Method Not Allowed
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
}

$conn->close();
?>