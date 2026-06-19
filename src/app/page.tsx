import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function IndexPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_id')?.value;

  // Smart server-side redirect based on session cookie existence
  if (sessionToken) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
