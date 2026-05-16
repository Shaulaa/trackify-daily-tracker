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
- Login Google dan sinkronisasi Firebase
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
|-- index.html
|-- css/
|   `-- style.css
|-- js/
|   |-- firebase.js
|   |-- notifications.js
|   |-- script.js
|   |-- pwa.js
|   |-- fcm.js
|   `-- integrasi-script-js.js
|-- img/
|   |-- favicon.png
|   |-- logo-pwa.png
|   |-- logo-trackify_lightmode.png
|   `-- logo_trackify_darkmodet.png
|-- api/
|-- firebase-messaging-sw.js
|-- manifest.json
|-- package.json
|-- vercel.json
`-- README.md
```

Catatan: `firebase-messaging-sw.js` tetap berada di root agar service worker Firebase/FCM bisa memakai scope root (`/`) dengan aman.

## Menjalankan Secara Lokal

Project ini adalah web app statis. Kamu bisa menjalankannya dengan local server sederhana.

Contoh dengan VS Code Live Server:

```text
Buka folder project lalu jalankan index.html dengan Live Server
```

Contoh dengan Node server sederhana:

```bash
npx serve .
```

Lalu buka:

```text
http://localhost:3000/
```

## Penyimpanan Data

- Tanpa login, data disimpan di `localStorage` browser
- Dengan login Google, data dapat disinkronkan ke Firebase
- Notifikasi memakai Browser Notification API di sisi client

## Catatan Pengembangan

- `index.html` hanya memuat struktur halaman dan referensi aset utama
- `css/style.css` menangani styling aplikasi
- `js/script.js` menangani state utama aplikasi
- `js/notifications.js` menangani pengaturan dan trigger notifikasi
- `js/firebase.js` menangani auth dan sinkronisasi Firestore

## Status

Project ini saat ini berbentuk frontend-first static web app dengan integrasi Firebase untuk login dan sinkronisasi data.
