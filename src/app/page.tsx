import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to default bin (Kantin LT 1)
  redirect('/kantinlt1');
}