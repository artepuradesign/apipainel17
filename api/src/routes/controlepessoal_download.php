<?php

require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../middleware/CorsMiddleware.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

$corsMiddleware = new CorsMiddleware();
$corsMiddleware->handle();

$authMiddleware = new AuthMiddleware($db);
if (!$authMiddleware->handle()) {
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^/api(?:\.php)?#', '', $path);
$path = rtrim($path, '/');

$downloadBasePath = realpath(__DIR__ . '/../../download');

if ($method !== 'GET') {
    Response::methodNotAllowed('Método não permitido');
}

if (preg_match('#^/controlepessoal-download/list$#', $path)) {
    if (!$downloadBasePath || !is_dir($downloadBasePath)) {
        Response::success(['files' => []], 'Pasta de download vazia');
    }

    $files = [];
    foreach (new DirectoryIterator($downloadBasePath) as $fileInfo) {
        if ($fileInfo->isDot() || !$fileInfo->isFile()) {
            continue;
        }

        $files[] = [
            'name' => $fileInfo->getFilename(),
            'size' => $fileInfo->getSize(),
            'updated_at' => date(DATE_ATOM, $fileInfo->getMTime()),
            'extension' => strtolower($fileInfo->getExtension()),
        ];
    }

    usort($files, function ($a, $b) {
        return strcmp($a['name'], $b['name']);
    });

    Response::success(['files' => $files], 'Arquivos carregados com sucesso');
}

if (preg_match('#^/controlepessoal-download/file$#', $path)) {
    $rawName = isset($_GET['name']) ? trim((string) $_GET['name']) : '';
    if ($rawName === '') {
        Response::error('Nome do arquivo é obrigatório', 400);
    }

    if (!$downloadBasePath || !is_dir($downloadBasePath)) {
        Response::notFound('Pasta de download não encontrada');
    }

    $safeName = basename($rawName);
    if ($safeName !== $rawName) {
        Response::error('Nome de arquivo inválido', 400);
    }

    $filePath = realpath($downloadBasePath . DIRECTORY_SEPARATOR . $safeName);
    if (!$filePath || strpos($filePath, $downloadBasePath) !== 0 || !is_file($filePath)) {
        Response::notFound('Arquivo não encontrado');
    }

    if (function_exists('header_remove')) {
        header_remove('Content-Type');
    }

    $mime = mime_content_type($filePath) ?: 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($filePath));
    header('Content-Disposition: attachment; filename="' . rawurlencode($safeName) . '"');

    readfile($filePath);
    exit;
}

Response::notFound('Endpoint não encontrado');
