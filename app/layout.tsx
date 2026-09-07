import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
const geist = Geist({variable:'--font-geist-sans', subsets:['latin']});
const origin='https://roadwith-me.luis-delsigno.chatgpt.site';
const title='Roadwith.me · El camino nos conecta';
const description='Encuentra compañeros de ruta, comparte tu tramo con un nickname y solicita apoyo en carretera.';
export const metadata: Metadata = {metadataBase:new URL(origin),title,description,icons:{icon:{url:'/logo-roadwith.png',type:'image/png'},apple:'/logo-roadwith.png'},openGraph:{title,description,type:'website',locale:'es_MX',url:origin,images:[{url:origin+'/og.png',width:563,height:562,alt:'Roadwith.me. Vas por tu cuenta, viajas acompañado.'}]},twitter:{card:'summary',title,description,images:[origin+'/og.png']}};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="es"><body className={geist.variable}>{children}</body></html>; }
