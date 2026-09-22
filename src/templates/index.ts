function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function controllerTemplate(name: string, className: string): string {
  const camelName = toCamelCase(name);
  return `import { Controller, Get } from '@galaxy-stack/orbit-core';
import { ${className}Service } from './${name}.service';

@Controller('/${name}')
export class ${className}Controller {
  constructor(private readonly ${camelName}Service: ${className}Service) {}

  @Get()
  findAll() {
    return this.${camelName}Service.findAll();
  }
}
`;
}

export function serviceTemplate(name: string, className: string): string {
  return `import { Injectable } from '@galaxy-stack/orbit-core';

@Injectable()
export class ${className}Service {
  findAll() {
    return [];
  }
}
`;
}

export function moduleTemplate(name: string, className: string): string {
  return `import { Module } from '@galaxy-stack/orbit-core';
import { ${className}Controller } from './${name}.controller';
import { ${className}Service } from './${name}.service';

@Module({
  controllers: [${className}Controller],
  providers: [${className}Service],
  exports: [${className}Service],
})
export class ${className}Module {}
`;
}

export function guardTemplate(name: string, className: string): string {
  return `import { Injectable } from '@galaxy-stack/orbit-core';
import type { CanActivate, ExecutionContext } from '@galaxy-stack/orbit-core';

@Injectable()
export class ${className}Guard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.getRequest<Request>();
    return true;
  }
}
`;
}

export function pipeTemplate(name: string, className: string): string {
  return `import { Injectable } from '@galaxy-stack/orbit-core';
import type { PipeTransform, ArgumentMetadata } from '@galaxy-stack/orbit-core';

@Injectable()
export class ${className}Pipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    return value;
  }
}
`;
}

export function interceptorTemplate(name: string, className: string): string {
  return `import { Injectable } from '@galaxy-stack/orbit-core';
import type { GalaxyInterceptor, ExecutionContext, CallHandler } from '@galaxy-stack/orbit-core';

@Injectable()
export class ${className}Interceptor implements GalaxyInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const start = Date.now();
    const result = await next.handle();
    const duration = Date.now() - start;
    console.log(\`[${className}Interceptor] \${duration}ms\`);
    return result;
  }
}
`;
}

export function middlewareTemplate(name: string, className: string): string {
  return `import { Injectable } from '@galaxy-stack/orbit-core';
import type { GalaxyMiddleware } from '@galaxy-stack/orbit-core';

@Injectable()
export class ${className}Middleware implements GalaxyMiddleware {
  async use(request: Request, next: () => Promise<Response>): Promise<Response> {
    return next();
  }
}
`;
}

export function filterTemplate(name: string, className: string): string {
  return `import { Injectable, Catch } from '@galaxy-stack/orbit-core';
import type { ExceptionFilter, ExecutionContext } from '@galaxy-stack/orbit-core';
import { HttpException } from '@galaxy-stack/orbit-core';

@Catch(HttpException)
@Injectable()
export class ${className}Filter implements ExceptionFilter {
  catch(exception: HttpException, context: ExecutionContext) {
    const request = context.getRequest<Request>();
    const status = exception.getStatus();
    const message = exception.message;
    
    return new Response(
      JSON.stringify({ statusCode: status, message, timestamp: new Date().toISOString() }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
`;
}

export function resolverTemplate(name: string, className: string): string {
  const camelName = toCamelCase(name);
  return `import { Injectable } from '@galaxy-stack/orbit-core';
import { Resolver, Query, Mutation, Args, ID } from '@galaxy-stack/orbit-graphql';
import { ${className}Service } from './${name}.service';
import { ${className} } from './${name}.entity';
import { Create${className}Input, Update${className}Input } from './${name}.input';

@Resolver(() => ${className})
@Injectable()
export class ${className}Resolver {
  constructor(private readonly ${camelName}Service: ${className}Service) {}

  @Query(() => [${className}], { name: '${camelName}s' })
  findAll(): Promise<${className}[]> {
    return this.${camelName}Service.findAll();
  }

  @Query(() => ${className}, { name: '${camelName}', nullable: true })
  findOne(@Args('id', { type: () => ID }) id: string): Promise<${className} | null> {
    return this.${camelName}Service.findOne(id);
  }

  @Mutation(() => ${className})
  create${className}(@Args('input') input: Create${className}Input): Promise<${className}> {
    return this.${camelName}Service.create(input);
  }

  @Mutation(() => ${className}, { nullable: true })
  update${className}(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: Update${className}Input
  ): Promise<${className} | null> {
    return this.${camelName}Service.update(id, input);
  }

  @Mutation(() => Boolean)
  remove${className}(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.${camelName}Service.remove(id);
  }
}
`;
}

export interface GraphqlResourceFiles {
  resolver: string;
  service: string;
  entity: string;
  input: string;
  module: string;
}

export function graphqlResourceTemplate(name: string, className: string): GraphqlResourceFiles {
  const camelName = toCamelCase(name);
  return {
    resolver: resolverTemplate(name, className),
    service: `import { Injectable } from '@galaxy-stack/orbit-core';
import { ${className} } from './${name}.entity';
import { Create${className}Input, Update${className}Input } from './${name}.input';

@Injectable()
export class ${className}Service {
  private items: ${className}[] = [];
  private idCounter = 1;

  async findAll(): Promise<${className}[]> {
    return this.items;
  }

  async findOne(id: string): Promise<${className} | null> {
    return this.items.find(item => item.id === id) || null;
  }

  async create(input: Create${className}Input): Promise<${className}> {
    const newItem: ${className} = {
      id: String(this.idCounter++),
      ...input,
      createdAt: new Date(),
    };
    this.items.push(newItem);
    return newItem;
  }

  async update(id: string, input: Update${className}Input): Promise<${className} | null> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return null;
    this.items[index] = { ...this.items[index], ...input };
    return this.items[index];
  }

  async remove(id: string): Promise<boolean> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }
}
`,
    entity: `import { ObjectType, Field, ID } from '@galaxy-stack/orbit-graphql';

@ObjectType()
export class ${className} {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  createdAt: Date;
}
`,
    input: `import { InputType, Field, PartialType } from '@galaxy-stack/orbit-graphql';

@InputType()
export class Create${className}Input {
  @Field()
  name: string;
}

@InputType()
export class Update${className}Input extends PartialType(Create${className}Input) {}
`,
    module: `import { Module } from '@galaxy-stack/orbit-core';
import { ${className}Resolver } from './${name}.resolver';
import { ${className}Service } from './${name}.service';

@Module({
  providers: [${className}Resolver, ${className}Service],
  exports: [${className}Service],
})
export class ${className}Module {}
`,
  };
}

export interface MicroserviceResourceFiles {
  handler: string;
  service: string;
  module: string;
  client: string;
}

export function microserviceTemplate(name: string, className: string): string {
  const camelName = toCamelCase(name);
  return `import { Injectable } from '@galaxy-stack/orbit-core';
import { MessagePattern, EventPattern, Payload, Ctx } from '@galaxy-stack/orbit-microservices';

@Injectable()
export class ${className}Handler {
  @MessagePattern('${camelName}.findAll')
  async findAll(@Payload() data: any, @Ctx() context: any): Promise<any[]> {
    return [];
  }

  @MessagePattern('${camelName}.findOne')
  async findOne(@Payload() data: { id: string }, @Ctx() context: any): Promise<any> {
    return { id: data.id };
  }

  @MessagePattern('${camelName}.create')
  async create(@Payload() data: any, @Ctx() context: any): Promise<any> {
    return { id: '1', ...data };
  }

  @MessagePattern('${camelName}.update')
  async update(@Payload() data: { id: string; updates: any }, @Ctx() context: any): Promise<any> {
    return { id: data.id, ...data.updates };
  }

  @MessagePattern('${camelName}.remove')
  async remove(@Payload() data: { id: string }, @Ctx() context: any): Promise<boolean> {
    return true;
  }

  @EventPattern('${camelName}.created')
  async handleCreated(@Payload() data: any, @Ctx() context: any): Promise<void> {
    console.log('${className} created:', data);
  }

  @EventPattern('${camelName}.updated')
  async handleUpdated(@Payload() data: any, @Ctx() context: any): Promise<void> {
    console.log('${className} updated:', data);
  }
}
`;
}

export function microserviceResourceTemplate(name: string, className: string): MicroserviceResourceFiles {
  const camelName = toCamelCase(name);
  return {
    handler: microserviceTemplate(name, className),
    service: `import { Injectable } from '@galaxy-stack/orbit-core';

@Injectable()
export class ${className}Service {
  private items: Map<string, any> = new Map();
  private idCounter = 1;

  async findAll(): Promise<any[]> {
    return Array.from(this.items.values());
  }

  async findOne(id: string): Promise<any | null> {
    return this.items.get(id) || null;
  }

  async create(data: any): Promise<any> {
    const id = String(this.idCounter++);
    const item = { id, ...data };
    this.items.set(id, item);
    return item;
  }

  async update(id: string, updates: any): Promise<any | null> {
    const item = this.items.get(id);
    if (!item) return null;
    const updated = { ...item, ...updates };
    this.items.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}
`,
    module: `import { Module } from '@galaxy-stack/orbit-core';
import { ${className}Handler } from './${name}.handler';
import { ${className}Service } from './${name}.service';

@Module({
  providers: [${className}Handler, ${className}Service],
  exports: [${className}Service],
})
export class ${className}Module {}
`,
    client: `import { Injectable } from '@galaxy-stack/orbit-core';
import { ClientProxy } from '@galaxy-stack/orbit-microservices';

@Injectable()
export class ${className}Client {
  constructor(private readonly client: ClientProxy) {}

  async findAll(): Promise<any[]> {
    return this.client.send('${camelName}.findAll', {});
  }

  async findOne(id: string): Promise<any> {
    return this.client.send('${camelName}.findOne', { id });
  }

  async create(data: any): Promise<any> {
    return this.client.send('${camelName}.create', data);
  }

  async update(id: string, updates: any): Promise<any> {
    return this.client.send('${camelName}.update', { id, updates });
  }

  async remove(id: string): Promise<boolean> {
    return this.client.send('${camelName}.remove', { id });
  }

  emit(event: string, data: any): void {
    this.client.emit(event, data);
  }
}
`,
  };
}

export interface ResourceFiles {
  controller: string;
  service: string;
  module: string;
  dto: string;
}

export function resourceTemplate(name: string, className: string): ResourceFiles {
  const camelName = toCamelCase(name);
  return {
    controller: `import { Controller, Get, Post, Body, Param, Put, Delete } from '@galaxy-stack/orbit-core';
import { ${className}Service } from './${name}.service';
import type { Create${className}Dto, Update${className}Dto } from './${name}.dto';

@Controller('/${name}')
export class ${className}Controller {
  constructor(private readonly ${camelName}Service: ${className}Service) {}

  @Get()
  findAll() {
    return this.${camelName}Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.${camelName}Service.findOne(+id);
  }

  @Post()
  create(@Body() createDto: Create${className}Dto) {
    return this.${camelName}Service.create(createDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: Update${className}Dto) {
    return this.${camelName}Service.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.${camelName}Service.remove(+id);
  }
}
`,
    service: `import { Injectable } from '@galaxy-stack/orbit-core';
import type { Create${className}Dto, Update${className}Dto } from './${name}.dto';

@Injectable()
export class ${className}Service {
  private items: any[] = [];
  private idCounter = 1;

  findAll() {
    return this.items;
  }

  findOne(id: number) {
    return this.items.find(item => item.id === id);
  }

  create(createDto: Create${className}Dto) {
    const newItem = { id: this.idCounter++, ...createDto };
    this.items.push(newItem);
    return newItem;
  }

  update(id: number, updateDto: Update${className}Dto) {
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      this.items[index] = { ...this.items[index], ...updateDto };
      return this.items[index];
    }
    return null;
  }

  remove(id: number) {
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      return this.items.splice(index, 1)[0];
    }
    return null;
  }
}
`,
    module: `import { Module } from '@galaxy-stack/orbit-core';
import { ${className}Controller } from './${name}.controller';
import { ${className}Service } from './${name}.service';

@Module({
  controllers: [${className}Controller],
  providers: [${className}Service],
  exports: [${className}Service],
})
export class ${className}Module {}
`,
    dto: `export interface Create${className}Dto {
  name: string;
}

export interface Update${className}Dto {
  name?: string;
}
`,
  };
}

export const templates: Record<string, (name: string, className: string) => string> = {
  controller: controllerTemplate,
  service: serviceTemplate,
  module: moduleTemplate,
  guard: guardTemplate,
  pipe: pipeTemplate,
  interceptor: interceptorTemplate,
  middleware: middlewareTemplate,
  filter: filterTemplate,
  resolver: resolverTemplate,
  handler: microserviceTemplate,
};

export const schematicAliases: Record<string, string> = {
  co: 'controller',
  s: 'service',
  mo: 'module',
  gu: 'guard',
  pi: 'pipe',
  in: 'interceptor',
  mi: 'middleware',
  f: 'filter',
  res: 'resource',
  r: 'resolver',
  gql: 'graphql-resource',
  h: 'handler',
  ms: 'microservice-resource',
};
