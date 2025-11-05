import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AzureDevOpsConfig from '@/models/AzureDevOpsConfig';
import AzureDevOpsWorkItem from '@/models/AzureDevOpsWorkItem';
import Priority from '@/models/Priority';
import { AzureDevOpsClient, mapAzureDevOpsStateToAppState } from '@/lib/azureDevOps';
import { getWeekDates } from '@/lib/utils';

/**
 * POST - Importa work items de Azure DevOps como prioridades
 */
export async function POST(request: NextRequest) {
  try {
    console.log('\n🚀 === INICIO DE IMPORTACIÓN ===');
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      console.log('❌ No hay sesión');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log(`✅ Usuario: ${(session.user as any).email} (ID: ${(session.user as any).id})`);

    // Verificar que el usuario sea del área Tecnología
    if ((session.user as any).area !== 'Tecnología') {
      console.log(`❌ Usuario no autorizado. Área: ${(session.user as any).area}`);
      return NextResponse.json(
        { error: 'Solo usuarios del área Tecnología pueden importar work items de Azure DevOps' },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log('📦 Body recibido:', JSON.stringify(body, null, 2));

    const { workItems, weekStart, weekEnd } = body;

    if (!workItems || !Array.isArray(workItems) || workItems.length === 0) {
      console.log('❌ No hay work items en el request');
      return NextResponse.json(
        { error: 'Debes seleccionar al menos un work item para importar' },
        { status: 400 }
      );
    }

    console.log(`📋 Work items a importar: ${workItems.length}`);

    // Validar que todos los work items tengan iniciativas
    const missingInitiatives = workItems.filter((wi: any) => !wi.initiativeIds || wi.initiativeIds.length === 0);
    if (missingInitiatives.length > 0) {
      console.log('❌ Faltan iniciativas en:', missingInitiatives);
      return NextResponse.json(
        { error: 'Todos los work items deben tener al menos una iniciativa estratégica asignada' },
        { status: 400 }
      );
    }

    console.log('✅ Todas las iniciativas validadas');

    await connectDB();
    console.log('✅ Conectado a MongoDB');

    // Obtener configuración del usuario
    const config = await AzureDevOpsConfig.findOne({
      userId: (session.user as any).id,
      isActive: true
    });

    if (!config) {
      return NextResponse.json(
        { error: 'No hay configuración de Azure DevOps' },
        { status: 404 }
      );
    }

    // Crear cliente de Azure DevOps
    const client = new AzureDevOpsClient({
      organization: config.organization,
      project: config.project,
      personalAccessToken: config.personalAccessToken
    });

    // Determinar semana (usar current week si no se especifica)
    const week = weekStart && weekEnd
      ? { monday: new Date(weekStart), friday: new Date(weekEnd) }
      : getWeekDates();

    const importResults = {
      success: [] as any[],
      errors: [] as any[],
      skipped: [] as any[]
    };

    // Procesar cada work item
    for (const workItemData of workItems) {
      const { workItemId, initiativeIds } = workItemData;

      console.log(`\n📝 Procesando work item #${workItemId}`);
      console.log(`   Iniciativas: ${initiativeIds.join(', ')}`);

      try {
        // Verificar si ya está importado
        const existing = await AzureDevOpsWorkItem.findOne({
          userId: (session.user as any).id,
          workItemId
        });

        if (existing) {
          console.log(`   ⚠️ Ya existe como prioridad ${existing.priorityId}`);
          importResults.skipped.push({
            workItemId,
            reason: 'Ya existe como prioridad'
          });
          continue;
        }

        // Obtener detalles del work item
        console.log('   🔍 Obteniendo detalles del work item...');
        const workItem = await client.getWorkItem(workItemId);
        console.log(`   ✅ Work item obtenido: ${workItem.fields['System.Title']}`);

        // Obtener child tasks (tareas hijas)
        const childTasks = await client.getChildTasks(workItemId);

        // Crear checklist con las child tasks
        const checklist = childTasks.map(task => ({
          text: task.fields['System.Title'],
          completed: task.fields['System.State'] === 'Done' || task.fields['System.State'] === 'Closed',
          createdAt: new Date()
        }));

        // Obtener enlaces de las discusiones
        const discussionLinks = await client.getWorkItemLinks(workItemId);

        // Crear enlace de evidencia al work item (URL web, no API)
        const workItemWebUrl = `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/${workItemId}`;
        const evidenceLinks = [
          {
            title: `Azure DevOps: ${workItem.fields['System.WorkItemType']} #${workItemId}`,
            url: workItemWebUrl,
            createdAt: new Date()
          },
          ...discussionLinks.map(link => ({
            ...link,
            createdAt: new Date()
          }))
        ];

        // Mapear estado de Azure DevOps a estado de la app
        const appState = mapAzureDevOpsStateToAppState(
          workItem.fields['System.State'],
          config.stateMapping
        );

        console.log(`   📊 Estado: ${workItem.fields['System.State']} → ${appState}`);
        console.log(`   📋 Checklist: ${checklist.length} tareas`);
        console.log(`   🔗 Enlaces: ${evidenceLinks.length} enlaces`);
        console.log(`   💾 Creando prioridad...`);

        // Crear prioridad con las iniciativas seleccionadas
        const priority = await Priority.create({
          title: workItem.fields['System.Title'],
          description: workItem.fields['System.Description'] || '',
          weekStart: week.monday,
          weekEnd: week.friday,
          status: appState,
          completionPercentage: appState === 'COMPLETADO' ? 100 : 0,
          type: 'ESTRATEGICA',
          userId: (session.user as any).id,
          initiativeIds: initiativeIds,
          wasEdited: false,
          isCarriedOver: false,
          checklist: checklist,
          evidenceLinks: evidenceLinks
        });

        console.log(`   ✅ Prioridad creada: ${priority._id}`);

        // Crear vínculo Azure DevOps
        await AzureDevOpsWorkItem.create({
          userId: (session.user as any).id,
          priorityId: priority._id,
          workItemId: workItem.id,
          workItemType: workItem.fields['System.WorkItemType'],
          organization: config.organization,
          project: config.project,
          lastSyncedState: workItem.fields['System.State']
        });

        importResults.success.push({
          workItemId,
          priorityId: priority._id.toString(),
          title: workItem.fields['System.Title'],
          childTasksCount: childTasks.length
        });

        console.log(`   ✅ Work item #${workItemId} importado exitosamente`);
      } catch (error) {
        console.error(`   ❌ Error importando work item ${workItemId}:`, error);
        if (error instanceof Error) {
          console.error(`   📝 Stack:`, error.stack);
        }
        importResults.errors.push({
          workItemId,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // Actualizar fecha de última sincronización
    await AzureDevOpsConfig.findByIdAndUpdate(config._id, {
      lastSyncDate: new Date()
    });

    console.log('\n📊 === RESUMEN DE IMPORTACIÓN ===');
    console.log(`   ✅ Exitosos: ${importResults.success.length}`);
    console.log(`   ⚠️ Omitidos: ${importResults.skipped.length}`);
    console.log(`   ❌ Errores: ${importResults.errors.length}`);
    console.log('=================================\n');

    return NextResponse.json({
      success: true,
      message: `Importados ${importResults.success.length} work items`,
      results: importResults
    });
  } catch (error) {
    console.error('\n❌ === ERROR CRÍTICO EN IMPORTACIÓN ===');
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    console.error('========================================\n');
    return NextResponse.json(
      { error: 'Error al importar work items' },
      { status: 500 }
    );
  }
}
