<?php
require_once __DIR__ . '/../controllers/CnpjChatInteligenteController.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../middleware/CorsMiddleware.php';
require_once __DIR__ . '/../utils/Response.php';

$corsMiddleware = new CorsMiddleware();
$corsMiddleware->handle();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!isset($db)) {
    Response::error('Erro de configuração do banco de dados', 500);
    exit;
}

$authMiddleware = new AuthMiddleware($db);
if (!$authMiddleware->handle()) {
    exit;
}

$controller = new CnpjChatInteligenteController($db);
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^/api(?:\.php)?#', '', $path);

switch ($method) {
    case 'GET':
        if (preg_match('#/cnpj-chatinteligente/agent/?$#', $path)) {
            $controller->getAgentConfig();
        } elseif (preg_match('#/cnpj-chatinteligente/connections/?$#', $path)) {
            $controller->listConnections();
        } else {
            Response::notFound('Endpoint não encontrado');
        }
        break;

    case 'POST':
        if (preg_match('#/cnpj-chatinteligente/connections/?$#', $path)) {
            $controller->createConnection();
        } else {
            Response::notFound('Endpoint não encontrado');
        }
        break;

    case 'PUT':
        if (preg_match('#/cnpj-chatinteligente/agent/?$#', $path)) {
            $controller->saveAgentConfig();
        } elseif (preg_match('#/cnpj-chatinteligente/connections/status/?$#', $path)) {
            $controller->updateConnectionStatus();
        } else {
            Response::notFound('Endpoint não encontrado');
        }
        break;

    default:
        Response::methodNotAllowed('Método não permitido');
        break;
}