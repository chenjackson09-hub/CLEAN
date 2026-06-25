import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}))
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

console.log('BEFORE:')
let { data: b } = await admin.from('cleaners').select('id,status')
console.log('  counts:', b.reduce((a,c)=>(a[c.status]=(a[c.status]||0)+1,a),{}))

const { data: a1, error: e1 } = await admin.from('cleaners').update({ status: 'approved' }).eq('status', 'active').select('id')
if (e1) { console.error('active->approved ERR', e1); process.exit(1) }
console.log('active -> approved:', a1.length, 'rows')

const { data: a2, error: e2 } = await admin.from('cleaners').update({ status: 'pending' }).eq('status', 'new').select('id')
if (e2) { console.error('new->pending ERR', e2); process.exit(1) }
console.log('new -> pending:', a2.length, 'rows')

console.log('AFTER:')
let { data: aft } = await admin.from('cleaners').select('id,status')
console.log('  counts:', aft.reduce((a,c)=>(a[c.status]=(a[c.status]||0)+1,a),{}))
const invalid = aft.filter(c=>!['pending','approved','rejected','suspended'].includes(c.status))
console.log('  invalid remaining:', invalid.length, invalid.map(c=>c.status))
