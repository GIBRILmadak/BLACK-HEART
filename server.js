
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Initialiser l'application Express
const app = express();
app.use(express.json());

// Configurer CORS pour autoriser toutes les origines
app.use(cors({
  origin: '*', // Autoriser toutes les origines
  methods: ['GET', 'POST'], // Autoriser uniquement les méthodes GET et POST
  allowedHeaders: ['Content-Type'] // Autoriser uniquement les en-têtes nécessaires
}));

// Middleware pour valider les données envoyées via des formulaires ou des appels API
app.use((req, res, next) => {
  if (req.method === 'POST' && (!req.is('application/json') && !req.is('multipart/form-data'))) {
    return res.status(400).json({ error: 'Les données doivent être envoyées au format JSON ou via un formulaire.' });
  }
  next();
});

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
        console.error('Erreur lors de la création de la table messages:', err.message);
      } else {
        console.log('Table messages vérifiée ou créée avec succès.');
      }
    });

    // Créer une table pour les témoignages
    db.run(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Erreur lors de la création de la table testimonials:', err.message);
      }
    });

    // Créer une table pour les messages d'espoir
    db.run(`
      CREATE TABLE IF NOT EXISTS hope_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Erreur lors de la création de la table hope_messages:', err.message);
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
// Route par défaut pour la racine
app.get('/', (req, res) => {
  res.send('Bienvenue sur le serveur Black Heart API!');
});

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
    return res.status(400).json({ error: 'Les champs "username" et "text" sont obligatoires.' });
  }

  // Tester si les données sont correctement reçues
  console.log('Données reçues pour /api/messages:', req.body);

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

// Obtenir tous les témoignages
app.get('/api/testimonials', (req, res) => {
  db.all('SELECT * FROM testimonials ORDER BY timestamp DESC', [], (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des témoignages:', err.message);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    } else {
      res.json(rows);
    }
  });
});

// Ajouter un nouveau témoignage
app.post('/api/testimonials', (req, res) => {
  const { name, message } = req.body;

  if (!name || !message) {
    return res.status(400).json({ error: 'Les champs "name" et "message" sont obligatoires.' });
  }

  // Tester si les données sont correctement reçues
  console.log('Données reçues pour /api/testimonials:', req.body);

  const query = `
    INSERT INTO testimonials (name, message)
    VALUES (?, ?)
  `;
  db.run(query, [name, message], function (err) {
    if (err) {
      console.error('Erreur lors de l\'ajout du témoignage:', err.message);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    } else {
      res.status(201).json({
        id: this.lastID,
        name,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  });
});

// Obtenir tous les messages d'espoir
app.get('/api/hope-messages', (req, res) => {
  db.all('SELECT * FROM hope_messages ORDER BY timestamp DESC', [], (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des messages d\'espoir:', err.message);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    } else {
      res.json(rows);
    }
  });
});

// Ajouter un nouveau message d'espoir
app.post('/api/hope-messages', (req, res) => {
  const { name, message } = req.body;

  if (!name || !message) {
    return res.status(400).json({ error: 'Les champs "name" et "message" sont obligatoires.' });
  }

  // Tester si les données sont correctement reçues
  console.log('Données reçues pour /api/hope-messages:', req.body);

  const query = `
    INSERT INTO hope_messages (name, message)
    VALUES (?, ?)
  `;
  db.run(query, [name, message], function (err) {
    if (err) {
      console.error('Erreur lors de l\'ajout du message d\'espoir:', err.message);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    } else {
      res.status(201).json({
        id: this.lastID,
        name,
        message,
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
  const fileURL = `https://black-heart.onrender.com/uploads/${req.file.filename}`;
  res.status(200).json({ fileURL });
});

// Servir les fichiers statiques dans le dossier "uploads"
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Démarrer le serveur
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});


