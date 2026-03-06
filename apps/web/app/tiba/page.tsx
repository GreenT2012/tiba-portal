import { redirect } from 'next/navigation';

export default function TibaPage() {
  redirect('/tickets?view=open');
}
