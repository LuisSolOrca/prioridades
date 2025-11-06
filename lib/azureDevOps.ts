/**
 * Servicio para interactuar con Azure DevOps API
 */

interface AzureDevOpsConfig {
  organization: string;
  project: string;
  personalAccessToken: string;
}

interface WorkItem {
  id: number;
  fields: {
    'System.Title': string;
    'System.Description'?: string;
    'System.State': string;
    'System.WorkItemType': string;
    'System.AssignedTo'?: {
      displayName: string;
      uniqueName: string;
    };
    'Microsoft.VSTS.Scheduling.StoryPoints'?: number;
    'System.IterationPath'?: string;
    'System.AreaPath'?: string;
  };
  url: string;
}

interface WorkItemQueryResult {
  workItems: { id: number; url: string }[];
}

/**
 * Cliente para Azure DevOps REST API
 */
export class AzureDevOpsClient {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(config: AzureDevOpsConfig) {
    this.baseUrl = `https://dev.azure.com/${config.organization}/${config.project}/_apis`;

    // Azure DevOps usa Basic Auth con PAT
    const token = Buffer.from(`:${config.personalAccessToken}`).toString('base64');
    this.headers = {
      'Authorization': `Basic ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Obtiene los work items asignados a un usuario
   */
  async getMyWorkItems(userEmail: string): Promise<WorkItem[]> {
    try {
      // WIQL query para obtener work items del usuario (solo historias y bugs, no tasks)
      const wiql = {
        query: `
          SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType]
          FROM WorkItems
          WHERE [System.AssignedTo] = '${userEmail}'
            AND [System.WorkItemType] IN ('User Story', 'Bug')
            AND [State] <> 'Closed'
            AND [State] <> 'Removed'
          ORDER BY [System.ChangedDate] DESC
        `
      };

      // Ejecutar query
      const queryResponse = await fetch(`${this.baseUrl}/wit/wiql?api-version=7.0`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(wiql)
      });

      if (!queryResponse.ok) {
        const errorText = await queryResponse.text();
        throw new Error(`Azure DevOps API error: ${queryResponse.status} - ${errorText}`);
      }

      const queryResult: WorkItemQueryResult = await queryResponse.json();

      if (queryResult.workItems.length === 0) {
        return [];
      }

      // Obtener detalles de los work items
      const workItemIds = queryResult.workItems.map(wi => wi.id).join(',');
      const detailsResponse = await fetch(
        `${this.baseUrl}/wit/workitems?ids=${workItemIds}&api-version=7.0`,
        {
          headers: this.headers
        }
      );

      if (!detailsResponse.ok) {
        throw new Error(`Error fetching work item details: ${detailsResponse.status}`);
      }

      const detailsResult = await detailsResponse.json();
      return detailsResult.value as WorkItem[];
    } catch (error) {
      console.error('Error fetching Azure DevOps work items:', error);
      throw error;
    }
  }

  /**
   * Obtiene un work item específico por ID
   */
  async getWorkItem(workItemId: number): Promise<WorkItem> {
    try {
      const response = await fetch(
        `${this.baseUrl}/wit/workitems/${workItemId}?api-version=7.0`,
        {
          headers: this.headers
        }
      );

      if (!response.ok) {
        throw new Error(`Error fetching work item ${workItemId}: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching work item ${workItemId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene las child tasks (tareas hijas) de un work item
   */
  async getChildTasks(workItemId: number): Promise<WorkItem[]> {
    try {
      // Obtener el work item con sus relaciones
      const response = await fetch(
        `${this.baseUrl}/wit/workitems/${workItemId}?$expand=relations&api-version=7.0`,
        {
          headers: this.headers
        }
      );

      if (!response.ok) {
        throw new Error(`Error fetching work item relations: ${response.status}`);
      }

      const workItem = await response.json();

      // Filtrar relaciones de tipo "Child"
      const childRelations = (workItem.relations || []).filter(
        (rel: any) => rel.rel === 'System.LinkTypes.Hierarchy-Forward'
      );

      if (childRelations.length === 0) {
        return [];
      }

      // Extraer IDs de los child work items
      const childIds = childRelations.map((rel: any) => {
        const url = rel.url;
        const id = url.substring(url.lastIndexOf('/') + 1);
        return id;
      }).join(',');

      // Obtener detalles de los child work items
      const detailsResponse = await fetch(
        `${this.baseUrl}/wit/workitems?ids=${childIds}&api-version=7.0`,
        {
          headers: this.headers
        }
      );

      if (!detailsResponse.ok) {
        throw new Error(`Error fetching child work items: ${detailsResponse.status}`);
      }

      const detailsResult = await detailsResponse.json();
      return detailsResult.value as WorkItem[];
    } catch (error) {
      console.error(`Error fetching child tasks for work item ${workItemId}:`, error);
      return []; // Retornar array vacío en caso de error
    }
  }

  /**
   * Obtiene los comentarios/discusiones de un work item y extrae los enlaces
   */
  async getWorkItemLinks(workItemId: number): Promise<{ title: string; url: string }[]> {
    try {
      // Obtener comentarios del work item
      const response = await fetch(
        `${this.baseUrl}/wit/workitems/${workItemId}/comments?api-version=7.0`,
        {
          headers: this.headers
        }
      );

      if (!response.ok) {
        console.error(`Error fetching comments for work item ${workItemId}: ${response.status}`);
        return [];
      }

      const commentsData = await response.json();
      const comments = commentsData.comments || [];

      // Extraer URLs de los comentarios
      const links: { title: string; url: string }[] = [];
      const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;

      for (const comment of comments) {
        const text = comment.text || '';
        const urls = text.match(urlRegex);

        if (urls) {
          urls.forEach((url: string) => {
            // Evitar duplicados
            if (!links.some(link => link.url === url)) {
              // Intentar extraer un título del contexto
              const contextMatch = text.match(new RegExp(`(.{0,50})${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'));
              const title = contextMatch ? contextMatch[1].trim() : `Link ${links.length + 1}`;

              links.push({
                title: title || `Enlace de discusión ${links.length + 1}`,
                url: url
              });
            }
          });
        }
      }

      return links;
    } catch (error) {
      console.error(`Error fetching links for work item ${workItemId}:`, error);
      return [];
    }
  }

  /**
   * Actualiza el estado de un work item
   */
  async updateWorkItemState(workItemId: number, newState: string): Promise<void> {
    try {
      const patchDocument = [
        {
          op: 'add',
          path: '/fields/System.State',
          value: newState
        }
      ];

      const response = await fetch(
        `${this.baseUrl}/wit/workitems/${workItemId}?api-version=7.0`,
        {
          method: 'PATCH',
          headers: {
            ...this.headers,
            'Content-Type': 'application/json-patch+json'
          },
          body: JSON.stringify(patchDocument)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error updating work item ${workItemId}: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error(`Error updating work item ${workItemId}:`, error);
      throw error;
    }
  }

  /**
   * Cierra una tarea con horas completadas
   */
  async closeTaskWithHours(taskId: number, completedHours: number): Promise<void> {
    try {
      const patchDocument = [
        {
          op: 'add',
          path: '/fields/System.State',
          value: 'Closed'
        },
        {
          op: 'add',
          path: '/fields/Microsoft.VSTS.Scheduling.CompletedWork',
          value: completedHours
        }
      ];

      const response = await fetch(
        `${this.baseUrl}/wit/workitems/${taskId}?api-version=7.0`,
        {
          method: 'PATCH',
          headers: {
            ...this.headers,
            'Content-Type': 'application/json-patch+json'
          },
          body: JSON.stringify(patchDocument)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error closing task ${taskId}: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error(`Error closing task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Reabre una tarea (cambia estado a Active)
   */
  async reopenTask(taskId: number): Promise<void> {
    try {
      const patchDocument = [
        {
          op: 'add',
          path: '/fields/System.State',
          value: 'Active'
        }
      ];

      const response = await fetch(
        `${this.baseUrl}/wit/workitems/${taskId}?api-version=7.0`,
        {
          method: 'PATCH',
          headers: {
            ...this.headers,
            'Content-Type': 'application/json-patch+json'
          },
          body: JSON.stringify(patchDocument)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error reopening task ${taskId}: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error(`Error reopening task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Crea un nuevo work item (User Story o Bug)
   */
  async createWorkItem(
    workItemType: 'User Story' | 'Bug',
    title: string,
    description?: string,
    areaPath?: string,
    iterationPath?: string,
    assignedTo?: string
  ): Promise<WorkItem> {
    try {
      const patchDocument = [
        {
          op: 'add',
          path: '/fields/System.Title',
          value: title
        }
      ];

      if (description) {
        patchDocument.push({
          op: 'add',
          path: '/fields/System.Description',
          value: description
        });
      }

      if (areaPath) {
        patchDocument.push({
          op: 'add',
          path: '/fields/System.AreaPath',
          value: areaPath
        });
      }

      if (iterationPath) {
        patchDocument.push({
          op: 'add',
          path: '/fields/System.IterationPath',
          value: iterationPath
        });
      }

      if (assignedTo) {
        patchDocument.push({
          op: 'add',
          path: '/fields/System.AssignedTo',
          value: assignedTo
        });
      }

      const response = await fetch(
        `${this.baseUrl}/wit/workitems/$${workItemType}?api-version=7.0`,
        {
          method: 'POST',
          headers: {
            ...this.headers,
            'Content-Type': 'application/json-patch+json'
          },
          body: JSON.stringify(patchDocument)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error creating work item: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating work item:', error);
      throw error;
    }
  }

  /**
   * Crea una tarea (Task) hijo de un work item
   */
  async createChildTask(
    parentWorkItemId: number,
    title: string,
    description?: string,
    assignedTo?: string
  ): Promise<WorkItem> {
    try {
      // Primero crear la tarea
      const patchDocument = [
        {
          op: 'add',
          path: '/fields/System.Title',
          value: title
        }
      ];

      if (description) {
        patchDocument.push({
          op: 'add',
          path: '/fields/System.Description',
          value: description
        });
      }

      if (assignedTo) {
        patchDocument.push({
          op: 'add',
          path: '/fields/System.AssignedTo',
          value: assignedTo
        });
      }

      const createResponse = await fetch(
        `${this.baseUrl}/wit/workitems/$Task?api-version=7.0`,
        {
          method: 'POST',
          headers: {
            ...this.headers,
            'Content-Type': 'application/json-patch+json'
          },
          body: JSON.stringify(patchDocument)
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Error creating task: ${createResponse.status} - ${errorText}`);
      }

      const task = await createResponse.json();

      // Luego vincular la tarea al work item padre
      const linkDocument = [
        {
          op: 'add',
          path: '/relations/-',
          value: {
            rel: 'System.LinkTypes.Hierarchy-Reverse',
            url: `${this.baseUrl}/wit/workitems/${parentWorkItemId}`,
            attributes: {
              comment: 'Making child task'
            }
          }
        }
      ];

      const linkResponse = await fetch(
        `${this.baseUrl}/wit/workitems/${task.id}?api-version=7.0`,
        {
          method: 'PATCH',
          headers: {
            ...this.headers,
            'Content-Type': 'application/json-patch+json'
          },
          body: JSON.stringify(linkDocument)
        }
      );

      if (!linkResponse.ok) {
        const errorText = await linkResponse.text();
        console.error(`Warning: Task created but linking failed: ${linkResponse.status} - ${errorText}`);
      }

      return task;
    } catch (error) {
      console.error('Error creating child task:', error);
      throw error;
    }
  }

  /**
   * Agrega un comentario a un work item (aparece en Discussion)
   */
  async addComment(workItemId: number, text: string): Promise<void> {
    try {
      // Usar el endpoint de discussions que aparece en la pestaña Discussion
      const response = await fetch(
        `${this.baseUrl}/wit/workItems/${workItemId}/comments?api-version=7.1-preview.3`,
        {
          method: 'POST',
          headers: {
            ...this.headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: text
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error adding comment to work item ${workItemId}: ${response.status} - ${errorText}`);
        throw new Error(`Error adding comment: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`Comment added successfully to work item ${workItemId}`);
      return result;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Obtiene la lista de areas/teams del proyecto
   */
  async getAreaPaths(): Promise<{ name: string; path: string }[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/wit/classificationnodes/areas?$depth=10&api-version=7.0`,
        {
          headers: this.headers
        }
      );

      if (!response.ok) {
        console.error('Error fetching area paths');
        return [];
      }

      const data = await response.json();
      const areas: { name: string; path: string }[] = [];

      // Función recursiva para extraer todas las áreas
      const extractAreas = (node: any, parentPath: string = '') => {
        const currentPath = parentPath ? `${parentPath}\\${node.name}` : node.name;
        areas.push({
          name: node.name,
          path: currentPath
        });

        if (node.children && node.children.length > 0) {
          node.children.forEach((child: any) => {
            extractAreas(child, currentPath);
          });
        }
      };

      if (data) {
        extractAreas(data);
      }

      return areas;
    } catch (error) {
      console.error('Error getting area paths:', error);
      return [];
    }
  }

  /**
   * Obtiene el sprint/iteración actual del equipo
   */
  async getCurrentIteration(): Promise<string | null> {
    try {
      // Obtener el equipo predeterminado del proyecto
      const teamsResponse = await fetch(
        `https://dev.azure.com/${this.baseUrl.split('/')[3]}/_apis/projects/${this.baseUrl.split('/')[4]}/teams?api-version=7.0`,
        {
          headers: this.headers
        }
      );

      if (!teamsResponse.ok) {
        console.error('Error fetching teams');
        return null;
      }

      const teamsData = await teamsResponse.json();
      const defaultTeam = teamsData.value?.[0];

      if (!defaultTeam) {
        return null;
      }

      // Obtener la iteración actual del equipo
      const iterationResponse = await fetch(
        `https://dev.azure.com/${this.baseUrl.split('/')[3]}/${this.baseUrl.split('/')[4]}/${defaultTeam.name}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.0`,
        {
          headers: this.headers
        }
      );

      if (!iterationResponse.ok) {
        console.error('Error fetching current iteration');
        return null;
      }

      const iterationData = await iterationResponse.json();
      const currentIteration = iterationData.value?.[0];

      return currentIteration?.path || null;
    } catch (error) {
      console.error('Error getting current iteration:', error);
      return null;
    }
  }

  /**
   * Verifica la conexión y las credenciales
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/wit/workitemtypes?api-version=7.0`,
        {
          headers: this.headers
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error testing Azure DevOps connection:', error);
      return false;
    }
  }
}

/**
 * Mapea estados de Azure DevOps a estados de la aplicación
 */
export function mapAzureDevOpsStateToAppState(
  azureState: string,
  customMapping?: Map<string, string>
): 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO' | 'REPROGRAMADO' {
  const defaultMapping: Record<string, 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO' | 'REPROGRAMADO'> = {
    'New': 'EN_TIEMPO',
    'Active': 'EN_TIEMPO',
    'Committed': 'EN_TIEMPO',
    'Review': 'EN_TIEMPO',
    'In Review': 'EN_TIEMPO',
    'Resolved': 'EN_TIEMPO',
    'Closed': 'COMPLETADO',
    'Done': 'COMPLETADO',
    'Removed': 'BLOQUEADO'
  };

  // Usar mapeo personalizado si existe
  if (customMapping && customMapping.has(azureState)) {
    const mappedValue = customMapping.get(azureState)!;
    // Validar que el valor mapeado sea un estado válido
    if (['EN_TIEMPO', 'EN_RIESGO', 'BLOQUEADO', 'COMPLETADO', 'REPROGRAMADO'].includes(mappedValue)) {
      return mappedValue as 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO' | 'REPROGRAMADO';
    }
  }

  return defaultMapping[azureState] || 'EN_TIEMPO';
}

/**
 * Mapea estados de la aplicación a estados de Azure DevOps
 */
export function mapAppStateToAzureDevOpsState(appState: string): string {
  const mapping: Record<string, string> = {
    'EN_TIEMPO': 'Active',
    'EN_RIESGO': 'Active',
    'BLOQUEADO': 'Removed',
    'COMPLETADO': 'Closed',
    'REPROGRAMADO': 'Removed' // Marcar como Removed en Azure DevOps (bloqueada)
  };

  return mapping[appState] || 'Active';
}
