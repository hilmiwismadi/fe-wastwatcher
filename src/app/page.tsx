import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to monitoring page
  redirect('/monitoring');
}