<?php
// Configuration for Database Connection (Update with your credentials)
$servername = "localhost";
$username = "root"; // Default XAMPP username
$password = "";     // Default XAMPP password is empty
$dbname = "ecolink"; // Your database name

// Directory where uploaded files will be stored
$upload_dir = "uploads/";

// Hardcoded ReporterID (Replace with actual session variable in a production system)
$reporter_id = 'TEMP_REP'; 

// ------------------------------------
// 1. Establish Database Connection & Setup
// ------------------------------------
try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->beginTransaction(); // Start a transaction for multi-table insertion
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "Database Connection Failed: " . $e->getMessage()]);
    exit();
}

// Ensure the upload directory exists
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

// ------------------------------------
// 2. Validate and Sanitize Input Data
// ------------------------------------
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit();
}

// Sanitize POST data
$description = filter_input(INPUT_POST, 'description', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$category = filter_input(INPUT_POST, 'category', FILTER_SANITIZE_STRING); // This will map to INCIDENT.Type
$latitude = filter_input(INPUT_POST, 'latitude', FILTER_VALIDATE_FLOAT);
$longitude = filter_input(INPUT_POST, 'longitude', FILTER_VALIDATE_FLOAT);

// Basic Required Field Check
if (empty($category) || empty($latitude) || empty($longitude)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Category, Latitude, and Longitude are required.']);
    exit();
}

// ------------------------------------
// 3. Insert into LOCATION table
// ------------------------------------
try {
    $sql_location = "INSERT INTO LOCATION (Latitude, Longitude) VALUES (:latitude, :longitude)";
    $stmt_location = $conn->prepare($sql_location);
    $stmt_location->bindParam(':latitude', $latitude);
    $stmt_location->bindParam(':longitude', $longitude);
    $stmt_location->execute();
    $location_id = $conn->lastInsertId(); // Get the newly created LocationID
    
} catch(PDOException $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "Location Insertion Error: " . $e->getMessage()]);
    exit();
}

// ------------------------------------
// 4. Insert into INCIDENT table
// ------------------------------------
// Generate a simple IncidentID (e.g., INC-timestamp)
$incident_id = 'INC-' . time(); 
// Default values for quick report
$severity = 'Medium'; 
$status = 'New';
$observed_impacts = '[]'; // Empty JSON array for quick report

try {
    $sql_incident = "INSERT INTO INCIDENT (IncidentID, ReporterID, LocationID, Type, Severity, Status, Description, ObservedImpacts) 
                     VALUES (:incident_id, :reporter_id, :location_id, :type, :severity, :status, :description, :observed_impacts)";
    
    $stmt_incident = $conn->prepare($sql_incident);

    $stmt_incident->bindParam(':incident_id', $incident_id);
    $stmt_incident->bindParam(':reporter_id', $reporter_id);
    $stmt_incident->bindParam(':location_id', $location_id);
    $stmt_incident->bindParam(':type', $category);
    $stmt_incident->bindParam(':severity', $severity);
    $stmt_incident->bindParam(':status', $status);
    $stmt_incident->bindParam(':description', $description);
    $stmt_incident->bindParam(':observed_impacts', $observed_impacts);
    
    $stmt_incident->execute();

} catch(PDOException $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "Incident Insertion Error: " . $e->getMessage()]);
    exit();
}

// ------------------------------------
// 5. Handle File Uploads and Insert into EVIDENCE table
// ------------------------------------
if (!empty($_FILES['evidence']['name'][0])) {
    $file_count = count($_FILES['evidence']['name']);

    for ($i = 0; $i < $file_count; $i++) {
        $file_tmp_name = $_FILES['evidence']['tmp_name'][$i];
        $file_name = basename($_FILES['evidence']['name'][$i]);
        $file_error = $_FILES['evidence']['error'][$i];
        $file_mime = $_FILES['evidence']['type'][$i];

        if ($file_error !== UPLOAD_ERR_OK) { continue; } // Skip file on error

        // Determine simple FileType from MIME
        $file_type = strtoupper(explode('/', $file_mime)[1] ?? 'UNKNOWN');
        $file_ext = pathinfo($file_name, PATHINFO_EXTENSION);
        if ($file_ext === 'pdf') $file_type = 'PDF';
        else if (str_starts_with($file_mime, 'video')) $file_type = 'MP4'; // Simplification

        // Generate a unique filename and destination path
        $unique_name = uniqid('evd_', true) . '-' . $file_name;
        $destination = $upload_dir . $unique_name;
        $file_url = $destination; // The path used for FileURL in the DB

        if (move_uploaded_file($file_tmp_name, $destination)) {
            try {
                $sql_evidence = "INSERT INTO EVIDENCE (IncidentID, FileType, FileURL, Description) 
                                 VALUES (:incident_id, :file_type, :file_url, :description)";
                $stmt_evidence = $conn->prepare($sql_evidence);
                $stmt_evidence->bindParam(':incident_id', $incident_id);
                $stmt_evidence->bindParam(':file_type', $file_type);
                $stmt_evidence->bindParam(':file_url', $file_url);
                $stmt_evidence->bindValue(':description', 'Evidence file for quick report');
                $stmt_evidence->execute();

            } catch(PDOException $e) {
                // Log file DB error, but continue if other files are OK
                error_log("Evidence DB Error: " . $e->getMessage()); 
            }
        }
    }
}

// ------------------------------------
// 6. Commit Transaction and Respond
// ------------------------------------
try {
    $conn->commit();
    http_response_code(200);
    echo json_encode([
        'success' => true, 
        'message' => 'Report submitted successfully!',
        'incident_id' => $incident_id
    ]);

} catch(PDOException $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "Transaction Commit Error: " . $e->getMessage()]);
}

$conn = null;
?>