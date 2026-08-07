<?php
// Entry point untuk deploy di Hostinger.
// Hostinger Git Deployment meng-clone seluruh repo ke /public_html/.
// File ini menjadi front controller: semua request dari domain diarahkan ke sini
// oleh .htaccess (root repo), lalu di-require ke backend/public/index.php.
//
// backend/ dan frontend/ diblok akses HTTP langsung via .htaccess masing-masing
// folder → hanya bisa dijangkau via require() PHP dari file ini.

require __DIR__ . '/backend/public/index.php';
