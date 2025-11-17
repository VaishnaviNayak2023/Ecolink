<?php
// ==============================
// guidedreport.php (updated)
// Ensures JSON response even on PHP warnings/notices
// ==============================

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Catch PHP errors and convert to JSON
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    $response = [
        'success' => false,
        'message' => "PHP Error: [$errno] $errstr in $errfile on line $errline",
        'errors' => []
    ];
    echo json_encode($response);
    exit;
});
set_exception_handler(function($e){
    $response = [
        'success' => false,
        'message' => "PHP Exception: ".$e->getMessage(),
        'errors' => []
    ];
    echo json_encode($response);
    exit;
});

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$response = ['success'=>false,'message'=>'An unknown error occurred.','errors'=>[]];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message']='Invalid request method.';
    echo json_encode($response); exit;
}

// Helper to safely get POST values
function post_val($key){ return isset($_POST[$key]) ? trim($_POST[$key]) : ''; }

$category=htmlspecialchars(post_val('category'),ENT_QUOTES,'UTF-8');
$latitude=post_val('latitude');
$longitude=post_val('longitude');
$landmark=htmlspecialchars(post_val('landmark'),ENT_QUOTES,'UTF-8');
$otherImpacts=htmlspecialchars(post_val('otherImpacts'),ENT_QUOTES,'UTF-8');
$details=htmlspecialchars(post_val('details'),ENT_QUOTES,'UTF-8');
$severity=htmlspecialchars(post_val('severity'),ENT_QUOTES,'UTF-8');
$date=htmlspecialchars(post_val('date'),ENT_QUOTES,'UTF-8');
$time=htmlspecialchars(post_val('time'),ENT_QUOTES,'UTF-8');
$fullname=htmlspecialchars(post_val('fullname'),ENT_QUOTES,'UTF-8');
$email=filter_var(post_val('email'),FILTER_SANITIZE_EMAIL);
$phone=htmlspecialchars(post_val('phone'),ENT_QUOTES,'UTF-8');

$impacts=[];
if(isset($_POST['impacts']) && is_array($_POST['impacts'])) {
    foreach($_POST['impacts'] as $imp) $impacts[]=htmlspecialchars(trim($imp),ENT_QUOTES,'UTF-8');
}

// --------------------
// Validation
// --------------------
if(empty($category)) $response['errors']['category']='Incident category is required.';
if($latitude===''||$longitude===''||!is_numeric($latitude)||!is_numeric($longitude)) $response['errors']['location']='A valid location is required.';
if(empty($details)) $response['errors']['details']='A description is required.';
if(empty($fullname)) $response['errors']['fullname']='Your name is required.';
if(empty($email)||!filter_var($email,FILTER_VALIDATE_EMAIL)) $response['errors']['email']='A valid email is required.';

// --------------------
// File upload
// --------------------
$upload_dir=__DIR__.'/uploads/';
$uploaded_files=[];
$max_file_size=10*1024*1024; // 10MB
$allowed_mimes=['image/jpeg'=>'jpg','image/png'=>'png','video/mp4'=>'mp4','video/quicktime'=>'mov','application/pdf'=>'pdf'];

if(!is_dir($upload_dir)) mkdir($upload_dir,0755,true);

if(isset($_FILES['evidence']) && !empty($_FILES['evidence']['name'][0])) {
    $file_count=count($_FILES['evidence']['name']);
    for($i=0;$i<$file_count;$i++){
        if($_FILES['evidence']['error'][$i]!==UPLOAD_ERR_OK){
            if($_FILES['evidence']['error'][$i]!==UPLOAD_ERR_NO_FILE) $response['errors']["file_$i"]="Upload error for file #$i";
            continue;
        }
        $tmp=$_FILES['evidence']['tmp_name'][$i];
        $name=$_FILES['evidence']['name'][$i];
        $size=$_FILES['evidence']['size'][$i];
        if($size>$max_file_size){ $response['errors']["file_$i"]="$name exceeds 10MB limit."; continue; }
        $finfo=finfo_open(FILEINFO_MIME_TYPE);
        $mime=finfo_file($finfo,$tmp);
        finfo_close($finfo);
        if(!isset($allowed_mimes[$mime])){ $response['errors']["file_$i"]="$name unsupported type ($mime)."; continue; }
        $ext=$allowed_mimes[$mime];
        $new_name=uniqid("guided_",true).".".$ext;
        $path=$upload_dir.$new_name;
        if(!move_uploaded_file($tmp,$path)){ $response['errors']["file_$i"]="Failed to save $name."; continue; }
        $uploaded_files[]='uploads/'.$new_name;
    }
}

// --------------------
// Determine final response
// --------------------
if(!empty($response['errors'])){
    $response['message']='Validation failed. Fix highlighted fields.';
    // allow submission if core required fields are valid
    $core_valid=empty($response['errors']['category'])
        && empty($response['errors']['location'])
        && empty($response['errors']['details'])
        && empty($response['errors']['fullname'])
        && empty($response['errors']['email']);
    if($core_valid){
        $response['success']=true;
        $response['message']='Report submitted, but some files failed to upload.';
        $response['files']=$uploaded_files;
    } else{
        echo json_encode($response); exit;
    }
} else {
    $response['success']=true;
    $response['message']="✅ Guided report submitted successfully!";
    $response['report_id']="GR-".strtoupper(substr(uniqid(),-6));
    $response['files']=$uploaded_files;
}

$response['data']=[
    'category'=>$category,
    'latitude'=>$latitude,
    'longitude'=>$longitude,
    'impacts'=>$impacts
];

echo json_encode($response);
exit;
?>
