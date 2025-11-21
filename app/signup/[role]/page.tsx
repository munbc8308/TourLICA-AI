import { notFound } from 'next/navigation';
import { roleInfos, SignupRole } from '../config';
import SignupForm from './signup-form';

interface SignupRolePageProps {
  params: { role: string };
}

export default function SignupRolePage({ params }: SignupRolePageProps) {
  const roleKey = params.role as SignupRole;
  const info = roleInfos[roleKey];

  if (!info) {
    notFound();
  }

  return <SignupForm role={roleKey} info={info} />;
}
