# Trackify

Trackify adalah personal dashboard berbasis web untuk mencatat target, habit, to-do, jurnal, refleksi, learning tracker, emosi, dan catatan pribadi dalam satu tempat.

## Fitur

- Dashboard ringkas untuk melihat progres harian
- Target tracker dengan status dan deadline
- Habit tracker dengan riwayat check-in
- To-do list dengan prioritas, kategori, dan deadline
- Daily journal dan weekly reflection
- Learning tracker
- Emotion tracker
- Catatan sosial dan komunikasi
- Tracker siklus menstruasi
- Backup dan restore data JSON
- Login Google + sinkronisasi Firebase
- Browser notification untuk pengingat lokal

## Tech Stack

- HTML, CSS, dan JavaScript modular
- Firebase Auth
- Firestore
- Chart.js
- Vercel untuk deployment static hosting

## Struktur Proyek

```text
.
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── img/
│   │   ├── favicon.png
│   │   ├── logo-trackify_lightmode.png
│   │   └── logo_trackify_darkmodet.png
│   └── js/
│       ├── firebase.js
│       ├── notifications.js
│       └── script.js
├── package.json
├── README.md
└── vercel.json
```

## Menjalankan Secara Lokal

Project ini adalah web app statis. Kamu bisa menjalankannya dengan local server sederhana.

Contoh dengan VS Code Live Server:

```text
Buka folder project lalu jalankan frontend/index.html dengan Live Server
```

Contoh dengan Node server sederhana:

```bash
npx serve .
```

Lalu buka:

```text
http://localhost:3000/frontend/index.html
```

## Deployment

Deploy default diarahkan melalui `vercel.json`.

- Root `/` akan diarahkan ke `frontend/index.html`
- Semua aset frontend dibaca dari folder `frontend/`

## Penyimpanan Data

- Tanpa login, data disimpan di `localStorage` browser
- Dengan login Google, data dapat disinkronkan ke Firebase
- Notifikasi memakai Browser Notification API di sisi client

## Catatan Pengembangan

- Root project dipakai untuk file level-repo seperti `package.json`, `.gitignore`, `README.md`, dan `vercel.json`
- Semua file yang dipakai browser diletakkan di folder `frontend/`
- `script.js` menangani state utama aplikasi
- `notifications.js` menangani pengaturan dan trigger notifikasi
- `firebase.js` menangani auth dan sinkronisasi Firestore

## Status

Project ini saat ini berbentuk frontend-first static web app dengan integrasi Firebase untuk login dan sinkronisasi data.
