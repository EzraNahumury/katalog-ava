<?php
/**
 * Hapus produk contoh "EZRA" (kategori UJI) yang terlanjur tampil di katalog
 * publik, beserta tingkat harga dan file gambarnya. Kategori UJI ikut dihapus
 * kalau sesudahnya tidak ada produk lain yang memakainya.
 */

return [
    'deskripsi' => 'Hapus produk contoh "EZRA" + kategori UJI kalau sudah kosong',

    'jalan' => function (PDO $pdo, callable $log, $dryRun) {
        // --- 1. Cari produknya ---
        $stmt = $pdo->prepare(
            'SELECT p.id, p.name, p.image, c.name AS kategori
               FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
              WHERE UPPER(p.name) = ?'
        );
        $stmt->execute(['EZRA']);
        $produk = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$produk) {
            $log('Produk "EZRA" tidak ada — tidak ada yang dihapus.');
        }

        $idDihapus = [];
        foreach ($produk as $p) {
            $idDihapus[] = (int)$p['id'];
            $log(sprintf(
                'Produk ditemukan: id=%d nama=%s kategori=%s',
                $p['id'],
                $p['name'],
                $p['kategori'] !== null ? $p['kategori'] : '-'
            ));

            if ($dryRun) {
                $log('  (simulasi) akan dihapus beserta tingkat harga & gambarnya');
                continue;
            }

            // Tingkat harga: di MySQL sudah ON DELETE CASCADE, dihapus eksplisit
            // supaya hasilnya sama di database mana pun.
            $delTiers = $pdo->prepare('DELETE FROM price_tiers WHERE product_id = ?');
            $delTiers->execute([$p['id']]);
            $log('  tingkat harga dihapus: ' . $delTiers->rowCount());

            $del = $pdo->prepare('DELETE FROM products WHERE id = ?');
            $del->execute([$p['id']]);
            $log('  baris produk dihapus: ' . $del->rowCount());

            // File gambar ikut dibuang, sama seperti saat hapus lewat admin.
            if (!empty($p['image']) && defined('APP_CONFIG')) {
                $cfg = APP_CONFIG;
                if (!empty($cfg['upload_dir'])) {
                    $path = rtrim($cfg['upload_dir'], '/\\') . '/' . $p['image'];
                    if (is_file($path) && @unlink($path)) {
                        $log('  file gambar dihapus: ' . $p['image']);
                    } else {
                        $log('  file gambar tidak ditemukan/di-skip: ' . $p['image']);
                    }
                }
            }
        }

        // --- 2. Kategori UJI dibuang kalau sudah tidak dipakai ---
        $cat = $pdo->prepare('SELECT id, name FROM categories WHERE UPPER(name) = ?');
        $cat->execute(['UJI']);
        $kategori = $cat->fetch(PDO::FETCH_ASSOC);

        if (!$kategori) {
            $log('Kategori UJI tidak ada.');
            return;
        }

        // Saat simulasi, produk di atas belum benar-benar dihapus — jangan ikut
        // dihitung, supaya laporannya sama dengan hasil jalan sungguhan.
        if ($dryRun && $idDihapus) {
            $ph  = implode(',', array_fill(0, count($idDihapus), '?'));
            $cnt = $pdo->prepare("SELECT COUNT(*) FROM products WHERE category_id = ? AND id NOT IN ($ph)");
            $cnt->execute(array_merge([$kategori['id']], $idDihapus));
        } else {
            $cnt = $pdo->prepare('SELECT COUNT(*) FROM products WHERE category_id = ?');
            $cnt->execute([$kategori['id']]);
        }
        $sisa = (int)$cnt->fetchColumn();

        if ($sisa > 0) {
            $log("Kategori UJI masih dipakai $sisa produk — dibiarkan.");
            return;
        }

        if ($dryRun) {
            $log('(simulasi) kategori UJI akan dihapus karena sudah kosong');
            return;
        }

        $delCat = $pdo->prepare('DELETE FROM categories WHERE id = ?');
        $delCat->execute([$kategori['id']]);
        $log('Kategori UJI dihapus: ' . $delCat->rowCount());
    },
];
