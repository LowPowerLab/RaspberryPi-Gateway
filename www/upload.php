<?php
  $postFileId = "file";
  if ($_FILES[$postFileId]["name"] == NULL)
  {
    header("HTTP/1.0 404 Not Found");
    exit;
  }

  $response['status'] = 'success';
  $response['message'] = '';
  
  $imagesDir = "images/";
  $uploadsDir = "uploads/";
  $target_dir = dirname(__FILE__) . '/' . $imagesDir . $uploadsDir;
  //$response['targetDir'] .= $target_dir;
  
  if (!file_exists($target_dir))
  {
    //if (!mkdir($target_dir, 0777, true))
    $response['message'] .= $target_dir ." DOES NOT EXIST";
    $uploadOk = 0;
  }

  $uploadOk = 1;
  $target_file = $target_dir;

  //prefix with "icon_"
  if (stripos($_FILES[$postFileId]["name"], "icon_") != 0)
    $target_file .= basename($_FILES[$postFileId]["name"]);
  else 
    $target_file .= "icon_" . basename($_FILES[$postFileId]["name"]);

  $imageFileType = strtolower(pathinfo($target_file,PATHINFO_EXTENSION));

  // Check if image file is a actual image or fake image
  if(isset($_POST["submit"])) {
    $check = getimagesize($_FILES[$postFileId]["tmp_name"]);
    if($check !== false) {
      $response['message'] .= "File is an image - " . $check["mime"];
      //$uploadOk = 1;
    } else {
      $response['message'] .= "File is not an image ";
      $uploadOk = 0;
    }
  }

  // Check if file already exists (delete old one, overwrite below)
  if (file_exists($target_file)) unlink($target_file);

  // Check file size
  if ($_FILES[$postFileId]["size"] > 500000) {
    $response['message'] .= "File too large (>500K) ";
    $uploadOk = 0;
  }

  // Allow certain file formats
  if($imageFileType != "jpg" && $imageFileType != "png" && $imageFileType != "jpeg" && $imageFileType != "gif" ) {
    $response['message'] .= "Only JPG/JPEG/PNG/GIF are allowed ";
    $uploadOk = 0;
  }

  // Check if $uploadOk is set to 0 by an error
  if ($uploadOk == 0) {
    $response['status'] = 'error';
    $response['message'] .= "Upload FAILED";
  } else { //all ok, try to upload file
    if (move_uploaded_file($_FILES[$postFileId]["tmp_name"], $target_file)) {
      $response['message'] = "Upload OK";
      $response['filePath'] = $uploadsDir . basename($target_file);
    } else {
      $response['status'] = 'error';
      $response['message'] .= "Upload FAILED";
    }
  }

  echo json_encode($response);
?>