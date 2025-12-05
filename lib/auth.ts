import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son requeridos');
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email });

        if (!user) {
          throw new Error('Usuario no encontrado');
        }

        if (!user.isActive) {
          throw new Error('Usuario inactivo');
        }

        const isPasswordValid = await user.comparePassword(credentials.password);

        if (!isPasswordValid) {
          throw new Error('Contraseña incorrecta');
        }

        // Defaults que se usan si el usuario no tiene permisos guardados
        const defaultPermissions = {
          viewDashboard: true,
          viewAreaDashboard: true,
          viewMyPriorities: true,
          viewReports: true,
          viewAnalytics: true,
          viewLeaderboard: true,
          viewAutomations: true,
          viewHistory: true,
          canReassignPriorities: user.role === 'ADMIN',
          canCreateMilestones: true,
          canEditHistoricalPriorities: user.role === 'ADMIN',
          canManageProjects: user.role === 'ADMIN',
          canManageKPIs: user.role === 'ADMIN',
          // CRM Permissions - defaults consistentes con modelo User
          viewCRM: true,
          canManageDeals: true,
          canManageContacts: true,
          canManagePipelineStages: false,
          // Marketing Permissions
          viewMarketing: true,
          canManageCampaigns: true,
          canPublishCampaigns: false,
          canManageWhatsApp: false,
          canViewWebAnalytics: true,
          canConfigureMarketingIntegrations: false,
        };

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          area: user.area,
          isAreaLeader: user.isAreaLeader,
          // Merge defaults con permisos guardados del usuario
          permissions: { ...defaultPermissions, ...(user.permissions || {}) },
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.area = (user as any).area;
        token.isAreaLeader = (user as any).isAreaLeader;
        token.permissions = (user as any).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).area = token.area;
        (session.user as any).isAreaLeader = token.isAreaLeader;
        (session.user as any).permissions = token.permissions;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  secret: process.env.NEXTAUTH_SECRET,
};
