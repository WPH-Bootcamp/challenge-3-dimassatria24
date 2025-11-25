// ==================================================
// HABIT TRACKER CLI
// ==================================================

// STEP 1: IMPORT MODULES
const readline = require('readline'); // Modul untuk membaca input dari terminal (CLI)
const fs = require('fs'); // Modul untuk membaca dan menulis file (untuk penyimpanan data)
const path = require('path'); // Modul untuk mempermudah manipulasi path file

// File data utama yang akan menyimpan semua kebiasaan dalam format JSON
const DATA_FILE = path.join(__dirname, 'habits-data.json');

// Interval pengingat dalam milidetik (10 detik = 10000 ms)
const REMINDER_INTERVAL = 10000;

// Konstanta jumlah hari dalam seminggu (untuk perhitungan progress mingguan)
const DAYS_IN_WEEK = 7;

// Membuat antarmuka CLI agar bisa membaca input dari user dan menampilkan output
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ==================================================
// STEP 2: USER PROFILE
// ==================================================
class UserProfile {
  constructor(data = {}) {
    // Mengambil nama dan umur dari data, atau memberikan nilai default jika tidak ada
    const name = data.name ?? 'Default';
    const age = data.age ?? 0;

    this.name = name; // Menyimpan nama user
    this.age = age; // Menyimpan umur user
    this.joinDate = new Date(); // Menyimpan tanggal pembuatan profil
    this.totalCompletions = 0; // Jumlah kebiasaan yang sudah diselesaikan oleh user
  }

  // Menambah jumlah total kebiasaan yang diselesaikan
  updateStats(count) {
    this.totalCompletions += count;
  }

  // Menghitung berapa hari user sudah bergabung
  getDaysJoined() {
    const now = new Date();
    // Menghitung selisih hari dari tanggal bergabung sampai sekarang
    return Math.floor((now - this.joinDate) / (1000 * 60 * 60 * 24));
  }
}

// ==================================================
// STEP 3: HABIT CLASS
// ==================================================
class Habit {
  constructor(id, name, targetFrequency) {
    this.id = id; // ID unik kebiasaan
    this.name = name; // Nama kebiasaan
    this.targetFrequency = targetFrequency; // Target berapa kali per minggu
    this.completions = []; // Menyimpan tanggal-tanggal penyelesaian
    this.createdAt = new Date(); // Tanggal pembuatan kebiasaan
    this.reminderCount = 0; // Menghitung berapa kali reminder muncul
  }

  // Menandai kebiasaan sebagai selesai (menambah tanggal ke daftar completions)
  markComplete() {
    this.completions.push(new Date());
  }

  // Mengambil daftar penyelesaian dalam seminggu terakhir
  getThisWeekCompletions() {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - DAYS_IN_WEEK);
    // Hanya ambil penyelesaian dalam 7 hari terakhir
    return this.completions.filter((date) => new Date(date) >= weekAgo);
  }

  // Mengecek apakah target mingguan sudah tercapai
  isCompletedThisWeek() {
    return this.getThisWeekCompletions().length >= this.targetFrequency;
  }

  // Menghitung persentase progres dari target mingguan
  getProgressPercentage() {
    const progress = Math.min(
      (this.getThisWeekCompletions().length / this.targetFrequency) * 100,
      100
    );
    return Math.round(progress);
  }

  // Mengembalikan status kebiasaan (Aktif/Selesai)
  getStatus() {
    return this.isCompletedThisWeek() ? 'Selesai' : 'Aktif';
  }

  // Mengambil semua kebiasaan yang masih aktif (belum tercapai target)
  static getActiveHabits(habits) {
    return habits.filter((h) => !h.isCompletedThisWeek());
  }
}

// ==================================================
// STEP 4: HABIT TRACKER
// ==================================================
class HabitTracker {
  constructor(userProfile) {
    this.user = userProfile; // Menyimpan profil user
    this.habits = []; // Daftar kebiasaan user
    this.reminderInterval = null; // Menyimpan interval reminder
    this.currentReminderIndex = 0; // Menentukan urutan reminder
    this.loadFromFile(); // Memuat data dari file jika ada
  }

  // Menambahkan kebiasaan baru
  addHabit(name, frequency) {
    const id = this.habits.length + 1; // ID kebiasaan berdasarkan jumlah kebiasaan
    const newHabit = new Habit(id, name, frequency); // Membuat objek Habit baru
    this.habits.push(newHabit); // Menambahkan ke daftar
    this.saveToFile(); // Menyimpan ke file
    console.log(`Kebiasaan "${name}" berhasil ditambahkan!`);
  }

  // Menandai kebiasaan selesai
  completeHabit(index) {
    const habit = this.habits[index - 1] ?? null; // Mengambil kebiasaan berdasarkan nomor
    if (!habit) return console.log('Habit tidak ditemukan.');
    habit.markComplete(); // Tandai selesai
    this.user.updateStats(1); // Tambahkan statistik pengguna
    this.saveToFile(); // Simpan perubahan
    console.log(`Kebiasaan "${habit.name}" ditandai selesai!`);
  }

  // Menghapus kebiasaan berdasarkan nomor
  deleteHabit(index) {
    this.habits.splice(index - 1, 1);
    this.saveToFile();
    console.log('Kebiasaan berhasil dihapus.');
  }

  // Menampilkan profil pengguna
  displayProfile() {
    console.log(`\nProfil Pengguna`);
    console.log(`Nama: ${this.user.name}`);
    console.log(`Umur: ${this.user.age}`);
    console.log(`Hari Bergabung: ${this.user.getDaysJoined()} hari`);
    console.log(`Total Completions: ${this.user.totalCompletions}`);
  }

  // Menampilkan semua kebiasaan, bisa difilter aktif/selesai
  displayHabits(filter = null) {
    console.log('\nDaftar Kebiasaan:');
    let filtered = this.habits;

    if (filter === 'active')
      filtered = this.habits.filter((h) => !h.isCompletedThisWeek());
    if (filter === 'done')
      filtered = this.habits.filter((h) => h.isCompletedThisWeek());

    // Menampilkan setiap kebiasaan dengan progress bar
    filtered.forEach((habit, i) => {
      const progress = habit.getProgressPercentage();
      const bar = '█'.repeat(progress / 10) + '░'.repeat(10 - progress / 10);
      console.log(`${i + 1}. [${habit.getStatus()}] ${habit.name}`);
      console.log(`   Target: ${habit.targetFrequency}x/minggu`);
      console.log(
        `   Progress: ${habit.getThisWeekCompletions().length}/${
          habit.targetFrequency
        } (${progress}%)`
      );
      console.log(`   Progress Bar: ${bar} ${progress}%\n`);
    });
  }

  // Menampilkan statistik kebiasaan aktif vs selesai
  displayStats() {
    const done = this.habits.filter((h) => h.isCompletedThisWeek()).length;
    const active = this.habits.length - done;
    console.log(`\nStatistik`);
    console.log(`Aktif: ${active}`);
    console.log(`Selesai: ${done}`);
  }

  // ==================================================
  // DEMO LOOP FUNCTION
  // ==================================================

  // Menampilkan kebiasaan dengan metode forEach
  showAllHabitsUsingForEach() {
    console.log('\n[FOR EACH LOOP]');
    this.habits.forEach((habit, i) => {
      console.log(`${i + 1}. ${habit.name}`);
    });
  }

  // Menampilkan kebiasaan dengan while loop
  showAllHabitsUsingWhile() {
    console.log('\n[WHILE LOOP]');
    let i = 0;
    while (i < this.habits.length) {
      console.log(`${i + 1}. ${this.habits[i].name}`);
      i++;
    }
  }

  // Menampilkan kebiasaan dengan for loop biasa
  showAllHabitsUsingFor() {
    console.log('\n[FOR LOOP]');
    for (let i = 0; i < this.habits.length; i++) {
      console.log(`${i + 1}. ${this.habits[i].name}`);
    }
  }

  // ==================================================
  // SISTEM REMINDER
  // ==================================================

  // Memulai pengingat otomatis
  startReminder() {
    if (this.reminderInterval) return; // Cegah duplikasi interval
    this.reminderInterval = setInterval(() => {
      this.showReminder(); // Jalankan pengingat setiap interval
    }, REMINDER_INTERVAL);
  }

  // Menghentikan pengingat otomatis
  stopReminder() {
    clearInterval(this.reminderInterval);
    this.reminderInterval = null;
  }

  // Menampilkan pesan pengingat kebiasaan
  showReminder() {
    const activeHabits = this.habits.filter((h) => !h.isCompletedThisWeek());
    if (activeHabits.length === 0) return; // Tidak ada kebiasaan aktif

    // Reminder muncul bergantian (bukan acak)
    const habit = activeHabits[this.currentReminderIndex % activeHabits.length];
    this.currentReminderIndex++;
    habit.reminderCount++;

    const message = `REMINDER: Jangan lupa "${habit.name}"! muncul ke-${habit.reminderCount}`;
    console.log(`\n\x1b[33m${message}\x1b[0m`); // Menampilkan warna kuning di terminal
    rl.prompt(true); // Menjaga agar prompt tidak terganggu
  }

  // ==================================================
  // FILE HANDLING
  // ==================================================

  // Menyimpan data user dan kebiasaan ke file JSON
  saveToFile() {
    const jsonData = JSON.stringify(
      { user: this.user, habits: this.habits },
      null,
      2
    );
    fs.writeFileSync(DATA_FILE, jsonData);
  }

  // Memuat data dari file JSON (jika ada)
  loadFromFile() {
    if (!fs.existsSync(DATA_FILE)) return;
    const jsonData = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(jsonData);

    // Memulihkan data user dan habit dengan class masing-masing
    this.user = new UserProfile(data.user);
    this.user.totalCompletions = data.user.totalCompletions;
    this.user.joinDate = new Date(data.user.joinDate);
    this.habits = data.habits.map((h) => Object.assign(new Habit(), h));
  }

  // Menghapus semua data dari file
  clearAllData() {
    fs.writeFileSync(DATA_FILE, '');
    this.habits = [];
    console.log('Semua data dihapus.');
  }
}

// ==================================================
// STEP 5: CLI INTERFACE
// ==================================================

// Fungsi pembungkus readline.question agar bisa pakai async/await
function askQuestion(query) {
  return new Promise((resolve) =>
    rl.question(query, (answer) => resolve(answer))
  );
}

// Menampilkan menu utama di terminal
async function displayMenu() {
  console.log(`\n==================================================`);
  console.log(`HABIT TRACKER - MAIN MENU`);
  console.log(`==================================================`);
  console.log(`1. Lihat Profil`);
  console.log(`2. Lihat Semua Kebiasaan`);
  console.log(`3. Lihat Kebiasaan Aktif`);
  console.log(`4. Lihat Kebiasaan Selesai`);
  console.log(`5. Tambah Kebiasaan Baru`);
  console.log(`6. Tandai Kebiasaan Selesai`);
  console.log(`7. Hapus Kebiasaan`);
  console.log(`8. Lihat Statistik`);
  console.log(`9. Demo Loop (for / while / forEach)`);
  console.log(`0. Keluar`);
  console.log(`==================================================`);
}

// Menangani logika pemilihan menu dari user
async function handleMenu(tracker) {
  tracker.startReminder(); // Mulai reminder otomatis
  let exit = false; // Flag untuk keluar dari loop menu

  while (!exit) {
    await displayMenu();
    const choice = await askQuestion('Pilih menu: ');

    switch (choice) {
      case '1':
        tracker.displayProfile();
        break;
      case '2':
        tracker.displayHabits();
        break;
      case '3':
        tracker.displayHabits('active');
        break;
      case '4':
        tracker.displayHabits('done');
        break;
      case '5': {
        const name = await askQuestion('Nama kebiasaan: ');
        const freq = parseInt(await askQuestion('Target per minggu: '));
        tracker.addHabit(name, freq);
        break;
      }
      case '6': {
        tracker.displayHabits();
        const index = parseInt(await askQuestion('Nomor kebiasaan: '));
        tracker.completeHabit(index);
        break;
      }
      case '7': {
        tracker.displayHabits();
        const index = parseInt(await askQuestion('Nomor kebiasaan: '));
        tracker.deleteHabit(index);
        break;
      }
      case '8':
        tracker.displayStats();
        break;
      case '9': {
        if (tracker.habits.length === 0) {
          console.log('\nBelum ada kebiasaan untuk ditampilkan.');
          break;
        }
        console.log(`\nPilih jenis loop untuk demo:`);
        console.log(`1. For`);
        console.log(`2. While`);
        console.log(`3. ForEach`);
        const loopChoice = await askQuestion('Masukkan pilihan: ');

        if (loopChoice === '1') tracker.showAllHabitsUsingFor();
        else if (loopChoice === '2') tracker.showAllHabitsUsingWhile();
        else if (loopChoice === '3') tracker.showAllHabitsUsingForEach();
        else console.log('Pilihan tidak valid.');
        break;
      }
      case '0':
        exit = true;
        break;
      default:
        console.log('Pilihan tidak valid.');
    }
  }

  tracker.stopReminder(); // Hentikan reminder ketika keluar
  rl.close(); // Tutup interface readline
}

// ==================================================
// STEP 6: MAIN FUNCTION
// ==================================================
(async function main() {
  console.log('==================================================');
  console.log('         WELCOME TO HABIT TRACKER CLI!');
  console.log('==================================================');

  // Ambil input profil pengguna di awal
  const name = await askQuestion('Masukkan nama Anda: ');
  const age = await askQuestion('Masukkan umur Anda: ');

  // Buat profil user dan tracker
  const user = new UserProfile({ name, age });
  const tracker = new HabitTracker(user);

  // Jalankan menu utama
  await handleMenu(tracker);
})();
