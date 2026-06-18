import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default function Home() {
  const token = cookies().get('gz_token')?.value;
  if (token) redirect('/dashboard');
  redirect('/login');
}
