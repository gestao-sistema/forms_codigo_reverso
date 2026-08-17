# Deploy no Railway

O projeto está pronto para deploy no [Railway](https://railway.app/).

## Backend (Supabase)
1. Certifique-se de que a Edge Function de admin-usuarios está no ar:
   \`\`\`bash
   supabase link --project-ref ymrrguubkqbxndhoxhor
   supabase functions deploy admin-usuarios
   \`\`\`
2. Crie os "Secrets" na Edge Function pelo painel do Supabase, contendo:
   - \`SUPABASE_URL\`
   - \`SUPABASE_ANON_KEY\`
   - \`SUPABASE_SERVICE_ROLE_KEY\`
3. Caso queira aplicar o RLS:
   \`\`\`bash
   DATABASE_URL="postgresql://postgres:SENHA@db.ymrrguubkqbxndhoxhor.supabase.co:5432/postgres" node run-sql-rls.cjs
   \`\`\`

## Frontend (Railway)
1. Conecte o repositório GitHub ao Railway.
2. O Railway lerá o \`Dockerfile\` (multi-stage: Node + Nginx).
3. Em **Variables** no dashboard do Railway, adicione:
   - \`VITE_SUPABASE_URL\` (Sua URL da API)
   - \`VITE_SUPABASE_ANON_KEY\` (A chave pública anon)
   > ⚠️ **NÃO** insira a \`SUPABASE_SERVICE_ROLE_KEY\` no frontend! O Dockerfile só fará expose do VITE_.
4. Após as vars setadas, dispare o build.
5. Em **Settings > Networking**, gere um domínio público.

O Nginx cuidará do SPA fallback na porta 80 e de cache de assets (CSS/JS hasheados).
