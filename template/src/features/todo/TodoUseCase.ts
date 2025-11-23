/**
 * Copyright 2025 wywy LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * you may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Copyright 2025 wywy LLC
 * Licensed under the Apache License, Version 2.0
 */

import { UniversalTodoRepo } from './UniversalTodoRepo.js';
import { Todo } from '../../core/types.js';

export class TodoUseCase {
  constructor(private repo: UniversalTodoRepo) {}

  async listTodos(): Promise<Todo[]> {
    return this.repo.getTodos();
  }

  async addTodo(title: string): Promise<Todo> {
    if (!title) throw new Error('Title is required');
    return this.repo.addTodo(title);
  }

  async toggleTodo(id: string): Promise<void> {
    const todos = await this.repo.getTodos();
    const todo = todos.find(t => t.id === id);
    if (!todo) throw new Error('Todo not found');

    await this.repo.updateTodo(id, { completed: !todo.completed });
  }

  async deleteTodo(id: string): Promise<void> {
    await this.repo.deleteTodo(id);
  }
}
