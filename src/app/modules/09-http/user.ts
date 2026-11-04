/** Shape of /mock/users.json items. A TS interface = compile-time only, NOT validated at runtime. */
export interface User {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly role: 'admin' | 'editor' | 'viewer';
}

export interface UserDetails extends User {
  readonly bio: string;
}

export type NewUser = Pick<User, 'name' | 'email'>;
