# ������� ����

�뿤��&�����n�����Phase 1: ����	

## =� ��ï����

### M�a�
- Node.js 20�

- Docker DesktopSupabase Local(	
- npm

### ��Ȣ��

1. **�X�¤����:**
   ```bash
   npm install
   ```

2. **Docker Desktopw�:**
   ```bash
   open -a Docker
   ```

3. **Supabase Localw�:**
   ```bash
   supabase start
   ```

4. **��	p-�:**
   ```bash
   cp .env.example .env.local
   # .env.local���supabase startn��$�(	
   ```

5. **�z����w�:**
   ```bash
   npm run dev
   ```

s0o [docs/SETUP.md](docs/SETUP.md) ��gWfO`UD

## =� �(n�K

###  ��
- Next.js 14����
- Supabase CLI ������-�
- ����ƣ����-�
- CI/CDѤ�����
- Supabase�餢�ȟ�

### = 2L-
- Docker Desktop ��Ȣ����ë�	
- Supabase Local wՅa

### =� !n����
- ������ޤ������9���� + RLS	
- UI�������Button, Card, Modal	
- XState���ȿ��

## =� �S��ï

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL 15, Realtime, Auth)
- **State:** XState v5, Zustand
- **Security:** Argon2id, HMAC-SHA256, Zod
- **Testing:** Playwright
- **CI/CD:** GitHub Actions

## =� ɭ����

- [��Ȣ�׬��](docs/SETUP.md) - s0j��Ȣ��K
- [Phase 1 ��;](docs/Phase_1_implementation_plan_v2.0.md) - 41�n�Ź�����

## = ����ƣ

- CSP (Content Security Policy) 	�
- HSTS (HTTP Strict Transport Security) -�
- Argon2id ѹ����÷�
- HMAC-SHA256 ѹ�������ï�

## =� CI/CD

GitHub Actionsg���՟L:
- ESLint
- TypeScript���ï
- Next.js ���
- ƹȟL

## =� 餻�

Private Project
