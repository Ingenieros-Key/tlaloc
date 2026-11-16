export type Profile = {
  readonly userId: string;
  readonly email: string;
  readonly displayName?: string;
  readonly bio?: string;
  readonly location?: string;
  readonly avatarKey?: string;
  readonly avatarUrl?: string;
  readonly createdAt?: string;
  readonly updatedAt: string;
};
