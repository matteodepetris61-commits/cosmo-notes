import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.resolve(__dirname, '../../workspace/users.json');

class AuthService {
  constructor() {
    this.initUsersFile();
  }

  async initUsersFile() {
    await fs.ensureDir(path.dirname(USERS_FILE));
    if (!await fs.pathExists(USERS_FILE)) {
      await fs.writeJson(USERS_FILE, { users: [] }, { spaces: 2 });
    }
  }

  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  generateToken(user) {
    const payload = `${user.id}:${user.email}:${Date.now()}`;
    const signature = crypto.createHmac('sha256', 'cosmonotes-secret-key-2026').update(payload).digest('hex');
    return Buffer.from(`${payload}:${signature}`).toString('base64');
  }

  verifyToken(token) {
    if (!token) return null;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const parts = decoded.split(':');
      if (parts.length !== 4) return null;
      const [id, email, timestamp, signature] = parts;
      const expectedPayload = `${id}:${email}:${timestamp}`;
      const expectedSignature = crypto.createHmac('sha256', 'cosmonotes-secret-key-2026').update(expectedPayload).digest('hex');
      if (signature !== expectedSignature) return null;
      return { id, email };
    } catch {
      return null;
    }
  }

  async register(email, password, name = '') {
    await this.initUsersFile();
    const data = await fs.readJson(USERS_FILE);
    const cleanEmail = email.toLowerCase().trim();

    if (data.users.find(u => u.email === cleanEmail)) {
      throw new Error('Un account con questa email Gmail esiste già.');
    }

    const userId = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const newUser = {
      id: userId,
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      passwordHash: this.hashPassword(password),
      createdAt: new Date().toISOString()
    };

    data.users.push(newUser);
    await fs.writeJson(USERS_FILE, data, { spaces: 2 });

    const token = this.generateToken(newUser);
    return { user: { id: newUser.id, email: newUser.email, name: newUser.name }, token };
  }

  async login(email, password) {
    await this.initUsersFile();
    const data = await fs.readJson(USERS_FILE);
    const cleanEmail = email.toLowerCase().trim();
    const user = data.users.find(u => u.email === cleanEmail);

    if (!user) {
      throw new Error('Account non trovato. Verifica l\'indirizzo email o registrati.');
    }

    if (user.passwordHash !== this.hashPassword(password)) {
      throw new Error('Password non corretta.');
    }

    const token = this.generateToken(user);
    return { user: { id: user.id, email: user.email, name: user.name }, token };
  }

  async getUserById(userId) {
    await this.initUsersFile();
    const data = await fs.readJson(USERS_FILE);
    return data.users.find(u => u.id === userId);
  }
}

export const authService = new AuthService();
