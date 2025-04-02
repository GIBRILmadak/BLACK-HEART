const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Initialiser l'application Express
const app = express();
app.use(express.json());
app.use(cors());

// Vérifier ou créer le fichier de base de données
const dbFile = './blackheart.db';
if (!fs.existsSync(dbFile)) {
  console.log('Fichier de base de données non trouvé. Création du fichier...');
  fs.writeFileSync(dbFile, '');
}

// Vérifier ou créer le dossier uploads
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  console.log('Dossier "uploads" non trouvé. Création du dossier...');
  fs.mkdirSync(uploadsDir);
}

// Configurer SQLite
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Erreur lors de l\'ouverture de la base de données:', err.message);
  } else {
    console.log('Connexion à la base de données SQLite réussie.');
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        profilePic TEXT,
        text TEXT,
        fileURL TEXT,
        fileType TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Erreur lors de la création de la table:', err.message);
      }
    });
  }
});

// Configurer le stockage des fichiers
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Routes API
// Obtenir tous les messages
app.get('/api/messages', (req, res) => {
  db.all('SELECT * FROM messages ORDER BY timestamp ASC', [], (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des messages:', err.message);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    } else {
      res.json(rows);
    }
  });
});

// Ajouter un nouveau message
app.post('/api/messages', (req, res) => {
  const { username, profilePic, text, fileURL, fileType } = req.body;

  if (!username || !text) {
    return res.status(400).json({ error: 'Le champ "username" et "text" sont obligatoires.' });
  }

  const query = `
    INSERT INTO messages (username, profilePic, text, fileURL, fileType)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.run(query, [username, profilePic, text, fileURL, fileType], function (err) {
    if (err) {
      console.error('Erreur lors de l\'ajout du message:', err.message);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    } else {
      res.status(201).json({
        id: this.lastID,
        username,
        profilePic,
        text,
        fileURL,
        fileType,
        timestamp: new Date().toISOString(),
      });
    }
  });
});

// Route pour télécharger un fichier
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier téléchargé.' });
  }
  const fileURL = `https://your-render-app-url.onrender.com/uploads/${req.file.filename}`;
  res.status(200).json({ fileURL });
});

// Servir les fichiers statiques dans le dossier "uploads"
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Démarrer le serveur
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});
