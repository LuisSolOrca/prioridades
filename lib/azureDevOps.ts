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
): string {
  const defaultMapping: Record<string, string> = {
    'New': 'EN_TIEMPO',
    'Active': 'EN_TIEMPO',
    'Committed': 'EN_TIEMPO',
    'Resolved': 'COMPLETADO',
    'Closed': 'COMPLETADO',
    'Done': 'COMPLETADO',
    'Removed': 'BLOQUEADO'
  };

  // Usar mapeo personalizado si existe
  if (customMapping && customMapping.has(azureState)) {
    return customMapping.get(azureState)!;
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
    'COMPLETADO': 'Closed'
  };

  return mapping[appState] || 'Active';
}
