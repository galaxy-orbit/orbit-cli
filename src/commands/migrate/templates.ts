export const mainTsTemplate = `import 'reflect-metadata';
import { OrbitFactory } from '@galaxy-stack/orbit-core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await OrbitFactory.create(AppModule);
  
  // Enable CORS if needed
  // app.use(new CorsMiddleware());
  
  // Global prefix
  // app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(\`🚀 Server running at http://localhost:\${port}\`);
}

bootstrap();
`;

export const appModuleTemplate = `import { Module } from '@galaxy-stack/orbit-core';
import { ConfigModule } from '@galaxy-stack/orbit-config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`;

export const packageJsonUpdates = {
  dependencies: {
    '@galaxy-stack/orbit-core': 'latest',
    '@galaxy-stack/orbit-common': 'latest',
    '@galaxy-stack/orbit-config': 'latest',
    'reflect-metadata': '^0.1.13',
  },
  devDependencies: {
    '@galaxy-stack/orbit-testing': 'latest',
    'orbit': 'latest',
    '@types/bun': 'latest',
  },
  scripts: {
    dev: 'orbit dev',
    build: 'orbit build',
    start: 'bun run dist/main.js',
    test: 'bun test',
  },
};

export const tsconfigUpdates = {
  compilerOptions: {
    target: 'ESNext',
    module: 'ESNext',
    moduleResolution: 'bundler',
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    strict: true,
    skipLibCheck: true,
    esModuleInterop: true,
  },
};

export function generateMigrationGuide(analysis: {
  hasTypeOrm: boolean;
  hasMongoose: boolean;
  hasPassport: boolean;
  hasBcrypt: boolean;
  hasClassValidator: boolean;
}): string {
  let guide = `# Orbit Migration Guide

This guide was generated based on your project analysis.

## Automatic Changes

The migration tool has automatically:
- Updated import statements from @nestjs/* to @galaxy-stack/orbit-*
- Changed NestFactory to OrbitFactory
- Updated package.json dependencies

## Manual Steps Required

`;

  if (analysis.hasTypeOrm) {
    guide += `### Database Migration (TypeORM → Drizzle)

Your project uses TypeORM. Orbit recommends Drizzle ORM for better TypeScript support.

1. Install Drizzle:
   \`\`\`bash
   bun add drizzle-orm
   bun add -d drizzle-kit
   \`\`\`

2. Create schema files using Drizzle syntax instead of TypeORM entities.

3. Replace repository patterns:
   \`\`\`typescript
   // Before (TypeORM)
   @InjectRepository(User)
   private userRepository: Repository<User>

   // After (Drizzle)
   @InjectDatabase()
   private db: Database
   \`\`\`

`;
  }

  if (analysis.hasPassport) {
    guide += `### Authentication Migration (Passport → @galaxy-stack/orbit-auth)

Your project uses Passport.js strategies. Orbit provides built-in auth:

1. Replace Passport strategies with Orbit guards:
   \`\`\`typescript
   // Before
   @UseGuards(AuthGuard('jwt'))

   // After
   @UseGuards(JwtAuthGuard)
   \`\`\`

2. Use @galaxy-stack/orbit-auth for JWT and password services:
   \`\`\`typescript
   import { JwtService, PasswordService } from '@galaxy-stack/orbit-auth';
   \`\`\`

`;
  }

  if (analysis.hasBcrypt) {
    guide += `### Password Hashing (bcrypt → Bun.password)

Bun provides native password hashing. Replace bcrypt:

\`\`\`typescript
// Before
import * as bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hash);

// After
const hash = await Bun.password.hash(password);
const isValid = await Bun.password.verify(password, hash);
\`\`\`

`;
  }

  if (analysis.hasClassValidator) {
    guide += `### Validation (class-validator → Zod)

Orbit recommends Zod for validation:

\`\`\`typescript
// Before
import { IsEmail, MinLength } from 'class-validator';

class CreateUserDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;
}

// After
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type CreateUserDto = z.infer<typeof CreateUserSchema>;
\`\`\`

`;
  }

  guide += `## Testing Your Migration

1. Install dependencies:
   \`\`\`bash
   bun install
   \`\`\`

2. Start development server:
   \`\`\`bash
   bun run dev
   \`\`\`

3. Run tests:
   \`\`\`bash
   bun test
   \`\`\`

## Getting Help

- Documentation: https://orbit.dev/docs
- GitHub Issues: https://github.com/orbit/orbit/issues
`;

  return guide;
}
