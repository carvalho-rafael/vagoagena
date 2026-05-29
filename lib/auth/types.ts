export type AccountProvider = {
  provider: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  accounts: AccountProvider[];
};

export type LoginResponse = {
  accessToken: string;
};

export type RefreshResponse = {
  accessToken: string;
};
