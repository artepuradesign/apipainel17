<?php
// src/models/CnpjProdutos.php

require_once __DIR__ . '/BaseModel.php';

class CnpjProdutos extends BaseModel {
    protected $table = 'cnpj_produtos';
    private $descriptionColumn = null;
    private $descriptionColumnResolved = false;
    private ?bool $userProfilesTableExists = null;

    public function __construct($db) {
        parent::__construct($db);
    }

    public function listProdutos(int $userId, bool $isAdmin, int $limit = 50, int $offset = 0, ?string $search = null, ?string $status = null, ?string $cnpj = null): array {
        $where = ['p.ativo = 1'];
        $params = [];

        if (!$isAdmin) {
            $where[] = 'p.user_id = ?';
            $params[] = $userId;
        }

        if ($search) {
            $where[] = '(p.nome_produto LIKE ? OR p.nome_empresa LIKE ? OR p.sku LIKE ? OR p.categoria LIKE ? OR p.marca LIKE ? OR p.tags LIKE ? OR p.codigo_barras LIKE ?)';
            $searchLike = '%' . $search . '%';
            $params[] = $searchLike;
            $params[] = $searchLike;
            $params[] = $searchLike;
            $params[] = $searchLike;
            $params[] = $searchLike;
            $params[] = $searchLike;
            $params[] = $searchLike;
        }

        if ($status) {
            $where[] = 'p.status = ?';
            $params[] = $status;
        }

        if ($cnpj) {
            $where[] = 'REPLACE(REPLACE(REPLACE(p.cnpj, ".", ""), "/", ""), "-", "") = ?';
            $params[] = preg_replace('/\D+/', '', $cnpj);
        }

        $whereSql = 'WHERE ' . implode(' AND ', $where);
        $query = "SELECT p.*, u.full_name AS owner_name, u.cnpj AS owner_cnpj, {$this->getOwnerAvatarSelectSql()}
                  FROM {$this->table} p
                  LEFT JOIN users u ON u.id = p.user_id
                  {$this->getOwnerProfileJoinSql()}
                  {$whereSql}
                  ORDER BY p.id DESC
                  LIMIT ? OFFSET ?";

        $params[] = (int)$limit;
        $params[] = (int)$offset;

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function countProdutos(int $userId, bool $isAdmin, ?string $search = null, ?string $status = null, ?string $cnpj = null): int {
        $where = ['ativo = 1'];
        $params = [];

        if (!$isAdmin) {
            $where[] = 'user_id = ?';
            $params[] = $userId;
        }

        if ($search) {
            $where[] = '(nome_produto LIKE ? OR nome_empresa LIKE ? OR sku LIKE ? OR categoria LIKE ? OR marca LIKE ? OR tags LIKE ? OR codigo_barras LIKE ?)';
            $searchLike = '%' . $search . '%';
            $params[] = $searchLike;
            $params[] = $searchLike;
            $params[] = $searchLike;
            $params[] = $searchLike;
            $params[] = $searchLike;
            $params[] = $searchLike;
            $params[] = $searchLike;
        }

        if ($status) {
            $where[] = 'status = ?';
            $params[] = $status;
        }

        if ($cnpj) {
            $where[] = 'REPLACE(REPLACE(REPLACE(cnpj, ".", ""), "/", ""), "-", "") = ?';
            $params[] = preg_replace('/\D+/', '', $cnpj);
        }

        $whereSql = 'WHERE ' . implode(' AND ', $where);
        $query = "SELECT COUNT(*) as count FROM {$this->table} {$whereSql}";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return (int)($row['count'] ?? 0);
    }

    public function findByIdForUser(int $id, int $userId, bool $isAdmin): ?array {
        $query = "SELECT p.*, u.full_name AS owner_name, u.cnpj AS owner_cnpj, {$this->getOwnerAvatarSelectSql()}
                  FROM {$this->table} p
                  LEFT JOIN users u ON u.id = p.user_id
                  {$this->getOwnerProfileJoinSql()}
                  WHERE p.id = ? AND p.ativo = 1";
        $params = [$id];

        if (!$isAdmin) {
            $query .= ' AND p.user_id = ?';
            $params[] = $userId;
        }

        $query .= ' LIMIT 1';

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function findPublicById(int $id): ?array {
        $query = "SELECT p.*, u.full_name AS owner_name, u.cnpj AS owner_cnpj, {$this->getOwnerAvatarSelectSql()}
                  FROM {$this->table} p
                  LEFT JOIN users u ON u.id = p.user_id
                  {$this->getOwnerProfileJoinSql()}
                  WHERE p.id = ?
                    AND p.ativo = 1
                    AND p.status = 'ativo'
                  LIMIT 1";

        $stmt = $this->db->prepare($query);
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function findByBarcodeForUser(string $barcode, int $userId, bool $isAdmin): ?array {
        $normalizedBarcode = preg_replace('/\D+/', '', $barcode);
        if ($normalizedBarcode === '') {
            return null;
        }

        $query = "SELECT p.*, u.full_name AS owner_name, u.cnpj AS owner_cnpj, {$this->getOwnerAvatarSelectSql()}
                  FROM {$this->table} p
                  LEFT JOIN users u ON u.id = p.user_id
                  {$this->getOwnerProfileJoinSql()}
                  WHERE p.ativo = 1
                    AND REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(p.codigo_barras, ''), ' ', ''), '.', ''), '-', ''), '/', '') = ?";
        $params = [$normalizedBarcode];

        if (!$isAdmin) {
            $query .= ' AND p.user_id = ?';
            $params[] = $userId;
        }

        $query .= ' ORDER BY p.updated_at DESC, p.id DESC LIMIT 1';

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function createProduto(array $data, int $userId): int {
        $columns = [
            'module_id',
            'user_id',
            'cnpj',
            'nome_empresa',
            'nome_produto',
            'sku',
            'categoria',
            'categoria_id',
            'tags',
            'marca',
            'marca_id',
            'external_featured_image_url',
            'codigo_barras',
            'controlar_estoque',
            'fotos_json',
            'preco',
            'estoque',
            'status',
            'ativo',
        ];

        $values = [
            (int)($data['module_id'] ?? 183),
            $userId,
            $data['cnpj'],
            $data['nome_empresa'],
            $data['nome_produto'],
            $data['sku'] ?? null,
            $data['categoria'] ?? null,
            $data['categoria_id'] ?? null,
            $data['tags'] ?? null,
            $data['marca'] ?? null,
            $data['marca_id'] ?? null,
            $data['external_featured_image_url'] ?? null,
            $data['codigo_barras'] ?? null,
            (int)($data['controlar_estoque'] ?? 0),
            $data['fotos_json'] ?? null,
            (float)$data['preco'],
            (int)$data['estoque'],
            $data['status'],
            1,
        ];

        $descriptionColumn = $this->getDescriptionColumn();
        if ($descriptionColumn !== null && (array_key_exists('descricao_produto', $data) || array_key_exists('descricao', $data))) {
            $columns[] = $descriptionColumn;
            $values[] = $data['descricao_produto'] ?? $data['descricao'] ?? null;
        }

        $placeholders = implode(', ', array_fill(0, count($columns), '?'));
        $query = "INSERT INTO {$this->table} (" . implode(', ', $columns) . ") VALUES ({$placeholders})";

        $stmt = $this->db->prepare($query);
        $stmt->execute($values);

        return (int)$this->db->lastInsertId();
    }

    public function listPublicByCnpj(string $cnpjDigits, int $limit = 120): array {
        $query = "SELECT p.*, u.full_name AS owner_name, u.cnpj AS owner_cnpj, {$this->getOwnerAvatarSelectSql()}
                  FROM {$this->table} p
                  LEFT JOIN users u ON u.id = p.user_id
                  {$this->getOwnerProfileJoinSql()}
                  WHERE p.ativo = 1
                    AND p.status = 'ativo'
                    AND REPLACE(REPLACE(REPLACE(p.cnpj, '.', ''), '/', ''), '-', '') = ?
                  ORDER BY p.created_at DESC, p.id DESC
                  LIMIT ?";

        $stmt = $this->db->prepare($query);
        $stmt->execute([$cnpjDigits, max(1, min(200, $limit))]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findPublicStoreMetaByCnpj(string $cnpjDigits): ?array {
        $query = "SELECT u.full_name AS nome_empresa, u.cnpj, {$this->getOwnerAvatarSelectSql()}
                  FROM users u
                  {$this->getOwnerProfileJoinSql()}
                  WHERE REPLACE(REPLACE(REPLACE(u.cnpj, '.', ''), '/', ''), '-', '') = ?
                  LIMIT 1";

        $stmt = $this->db->prepare($query);
        $stmt->execute([$cnpjDigits]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function updateProduto(int $id, array $fields): bool {
        $sets = [];
        $params = [];

        $allowedFields = ['cnpj', 'nome_empresa', 'nome_produto', 'sku', 'categoria', 'categoria_id', 'tags', 'marca', 'marca_id', 'external_featured_image_url', 'codigo_barras', 'controlar_estoque', 'fotos_json', 'preco', 'estoque', 'status'];

        $descriptionColumn = $this->getDescriptionColumn();
        if ($descriptionColumn !== null) {
            if ($descriptionColumn === 'descricao_produto' && array_key_exists('descricao', $fields) && !array_key_exists('descricao_produto', $fields)) {
                $fields['descricao_produto'] = $fields['descricao'];
            }

            if ($descriptionColumn === 'descricao' && array_key_exists('descricao_produto', $fields) && !array_key_exists('descricao', $fields)) {
                $fields['descricao'] = $fields['descricao_produto'];
            }

            $allowedFields[] = $descriptionColumn;
        }

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $fields)) {
                $sets[] = "{$field} = ?";
                $params[] = $fields[$field];
            }
        }

        if (empty($sets)) {
            return false;
        }

        $params[] = $id;
        $query = "UPDATE {$this->table} SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->db->prepare($query);
        return $stmt->execute($params);
    }

    public function deleteProduto(int $id): bool {
        $query = "UPDATE {$this->table} SET ativo = 0, status = 'inativo', updated_at = NOW() WHERE id = ?";
        $stmt = $this->db->prepare($query);
        return $stmt->execute([$id]);
    }

    public function getSectionNames(int $userId, bool $isAdmin): array {
        $sections = [
            'categories' => [],
            'brands' => [],
            'tags' => [],
        ];

        if ($this->tableExists('cnpj_product_categories')) {
            $sections['categories'] = $this->querySectionNamesFromTaxonomy('cnpj_product_categories', $userId, $isAdmin);
        }

        if ($this->tableExists('cnpj_product_brands')) {
            $sections['brands'] = $this->querySectionNamesFromTaxonomy('cnpj_product_brands', $userId, $isAdmin);
        }

        if ($this->tableExists('cnpj_product_tags')) {
            $sections['tags'] = $this->querySectionNamesFromTaxonomy('cnpj_product_tags', $userId, $isAdmin, 80);
        }

        if (empty($sections['categories'])) {
            $sections['categories'] = $this->queryDistinctProdutoValues('categoria', $userId, $isAdmin, 120);
        }

        if (empty($sections['brands'])) {
            $sections['brands'] = $this->queryDistinctProdutoValues('marca', $userId, $isAdmin, 120);
        }

        if (empty($sections['tags'])) {
            $rawTags = $this->queryDistinctProdutoValues('tags', $userId, $isAdmin, 500);
            $parsedTags = [];

            foreach ($rawTags as $tagLine) {
                foreach (explode(',', $tagLine) as $tagItem) {
                    $trimmed = mb_substr(trim((string)$tagItem), 0, 80);
                    if ($trimmed !== '') {
                        $parsedTags[] = $trimmed;
                    }
                }
            }

            $sections['tags'] = $this->normalizeSectionValues($parsedTags);
        }

        return $sections;
    }

    private function querySectionNamesFromTaxonomy(string $table, int $userId, bool $isAdmin, int $maxLength = 120): array {
        $query = "SELECT nome FROM {$table} WHERE ativo = 1 AND module_id = 183";
        $params = [];

        if (!$isAdmin) {
            $query .= ' AND (user_id IS NULL OR user_id = ?)';
            $params[] = $userId;
        }

        $query .= ' ORDER BY nome ASC LIMIT 200';

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);

        return $this->normalizeSectionValues($rows, $maxLength);
    }

    private function queryDistinctProdutoValues(string $column, int $userId, bool $isAdmin, int $maxLength): array {
        $query = "SELECT DISTINCT {$column} FROM {$this->table} WHERE ativo = 1 AND {$column} IS NOT NULL AND {$column} <> ''";
        $params = [];

        if (!$isAdmin) {
            $query .= ' AND user_id = ?';
            $params[] = $userId;
        }

        $query .= " ORDER BY {$column} ASC LIMIT 300";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);

        return $this->normalizeSectionValues($rows, $maxLength);
    }

    private function normalizeSectionValues(array $values, int $maxLength = 120): array {
        $normalized = [];

        foreach ($values as $value) {
            $label = mb_substr(trim((string)$value), 0, $maxLength);
            if ($label === '') {
                continue;
            }

            $key = mb_strtolower($label);
            $normalized[$key] = $label;
        }

        ksort($normalized);
        return array_values($normalized);
    }

    private function tableExists(string $tableName): bool {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
        $stmt->execute([$tableName]);
        return ((int)$stmt->fetchColumn()) > 0;
    }

    private function hasUserProfilesTable(): bool {
        if ($this->userProfilesTableExists !== null) {
            return $this->userProfilesTableExists;
        }

        $this->userProfilesTableExists = $this->tableExists('user_profiles');
        return $this->userProfilesTableExists;
    }

    private function getOwnerAvatarSelectSql(): string {
        return $this->hasUserProfilesTable()
            ? 'up.avatar_url AS owner_avatar_url'
            : 'NULL AS owner_avatar_url';
    }

    private function getOwnerProfileJoinSql(): string {
        return $this->hasUserProfilesTable()
            ? 'LEFT JOIN user_profiles up ON up.user_id = u.id'
            : '';
    }

    private function getDescriptionColumn(): ?string {
        if ($this->descriptionColumnResolved) {
            return $this->descriptionColumn;
        }

        foreach (['descricao_produto', 'descricao'] as $column) {
            $stmt = $this->db->prepare("SHOW COLUMNS FROM {$this->table} LIKE ?");
            $stmt->execute([$column]);
            if ($stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->descriptionColumn = $column;
                $this->descriptionColumnResolved = true;
                return $this->descriptionColumn;
            }
        }

        $this->descriptionColumn = null;
        $this->descriptionColumnResolved = true;
        return null;
    }
}
