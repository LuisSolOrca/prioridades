import * as XLSX from 'xlsx';
import { trackFeature } from './trackFeature';

export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Datos') => {
  try {
    // Crear un nuevo workbook
    const workbook = XLSX.utils.book_new();

    // Convertir los datos a worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Ajustar el ancho de las columnas automáticamente
    const maxWidth = 50;
    const columnWidths = Object.keys(data[0] || {}).map(key => {
      const maxLength = Math.max(
        key.length,
        ...data.map(row => String(row[key] || '').length)
      );
      return { wch: Math.min(maxLength + 2, maxWidth) };
    });
    worksheet['!cols'] = columnWidths;

    // Agregar la worksheet al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generar el archivo y descargarlo
    XLSX.writeFile(workbook, `${fileName}.xlsx`);

    // Trackear la exportación de Excel
    trackFeature('excelExports').catch(err =>
      console.error('Error tracking Excel export:', err)
    );

    return true;
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    return false;
  }
};

// Función específica para exportar prioridades
export const exportPriorities = (
  priorities: any[],
  users: any[],
  initiatives: any[],
  fileName: string = 'Prioridades'
) => {
  const data = priorities.map(priority => {
    // Manejar el caso donde userId puede ser un objeto poblado o un string
    const userId = typeof priority.userId === 'string'
      ? priority.userId
      : (priority.userId as any)?._id || priority.userId;

    const user = users.find(u => u._id === userId);
    const initiative = initiatives.find(i => i._id === priority.initiativeId);

    return {
      'Título': priority.title,
      'Descripción': priority.description || '',
      'Usuario': user?.name || 'N/A',
      'Iniciativa': initiative?.name || 'N/A',
      'Estado': priority.status,
      '% Completado': priority.completionPercentage,
      'Semana Inicio': new Date(priority.weekStart).toLocaleDateString('es-MX'),
      'Semana Fin': new Date(priority.weekEnd).toLocaleDateString('es-MX'),
      'Editado': priority.wasEdited ? 'Sí' : 'No',
      'Fecha Creación': new Date(priority.createdAt || priority.weekStart).toLocaleDateString('es-MX')
    };
  });

  return exportToExcel(data, fileName, 'Prioridades');
};

// Función para exportar estadísticas de usuarios
export const exportUserStats = (
  userStats: any[],
  fileName: string = 'Analitica_Usuarios'
) => {
  const data = userStats.map(stat => ({
    'Usuario': stat.user.name,
    'Email': stat.user.email,
    'Rol': stat.user.role,
    'Total Prioridades': stat.total,
    'Completadas': stat.completed,
    'Tasa Completado (%)': stat.completionRate,
    'Promedio Avance (%)': stat.avgCompletion
  }));

  return exportToExcel(data, fileName, 'Rendimiento Usuarios');
};

// Función para exportar iniciativas
export const exportInitiativeStats = (
  initiativeStats: any[],
  fileName: string = 'Analitica_Iniciativas'
) => {
  const data = initiativeStats.map(stat => ({
    'Iniciativa': stat.initiative.name,
    'Descripción': stat.initiative.description || '',
    'Color': stat.initiative.color,
    'Total Prioridades': stat.count,
    'Porcentaje (%)': stat.percentage,
    'Activa': stat.initiative.isActive ? 'Sí' : 'No'
  }));

  return exportToExcel(data, fileName, 'Distribución Iniciativas');
};

// Función para exportar estadísticas de áreas
export const exportAreaStats = (
  areaStats: any[],
  fileName: string = 'Analitica_Areas'
) => {
  const data = areaStats.map(stat => ({
    'Área': stat.area,
    'Usuarios': stat.userCount,
    'Total Prioridades': stat.total,
    'Completadas': stat.completed,
    'Tasa Completado (%)': stat.completionRate,
    'Promedio Avance (%)': stat.avgCompletion,
    'Puntos Totales': stat.monthPoints
  }));

  return exportToExcel(data, fileName, 'Rendimiento por Área');
};

// Función para exportar usuarios
export const exportUsers = (
  users: any[],
  fileName: string = 'Usuarios'
) => {
  const data = users.map(user => ({
    'Nombre': user.name,
    'Email': user.email,
    'Rol': user.role,
    'Estado': user.isActive ? 'Activo' : 'Inactivo',
    'Fecha Creación': new Date(user.createdAt || Date.now()).toLocaleDateString('es-MX')
  }));

  return exportToExcel(data, fileName, 'Usuarios');
};

// Función para exportar iniciativas estratégicas
export const exportInitiatives = (
  initiatives: any[],
  fileName: string = 'Iniciativas_Estrategicas'
) => {
  const data = initiatives.map(initiative => ({
    'Orden': initiative.order,
    'Nombre': initiative.name,
    'Descripción': initiative.description || '',
    'Color': initiative.color,
    'Estado': initiative.isActive ? 'Activa' : 'Inactiva',
    'Fecha Creación': new Date(initiative.createdAt || Date.now()).toLocaleDateString('es-MX')
  }));

  return exportToExcel(data, fileName, 'Iniciativas Estratégicas');
};

// Función para exportar prioridades agrupadas por área
export const exportPrioritiesByArea = (
  priorities: any[],
  users: any[],
  initiatives: any[],
  fileName: string = 'Prioridades_Por_Area'
) => {
  // Agrupar usuarios por área
  const areaMap = new Map<string, { leader: any; users: any[] }>();

  users.forEach(user => {
    const areaKey = user.area || 'Sin Área Asignada';
    if (!areaMap.has(areaKey)) {
      areaMap.set(areaKey, { leader: null, users: [] });
    }
    const areaData = areaMap.get(areaKey)!;
    areaData.users.push(user);
    if (user.isAreaLeader) {
      areaData.leader = user;
    }
  });

  // Crear datos para exportación
  const data = priorities.map(priority => {
    const user = users.find(u => u._id === priority.userId);
    const userArea = user?.area || 'Sin Área Asignada';
    const areaData = areaMap.get(userArea);
    const leader = areaData?.leader;

    // Obtener iniciativas (soportar múltiples iniciativas)
    const priorityInitiativeIds = priority.initiativeIds || (priority.initiativeId ? [priority.initiativeId] : []);
    const priorityInitiatives = priorityInitiativeIds
      .map((id: string) => initiatives.find(i => i._id === id))
      .filter((init: any) => init !== undefined);
    const initiativeNames = priorityInitiatives.map((i: any) => i.name).join(', ') || 'N/A';

    return {
      'Área': userArea,
      'Líder de Área': leader?.name || 'Sin líder',
      'Usuario': user?.name || 'N/A',
      'Título': priority.title,
      'Descripción': priority.description || '',
      'Iniciativa(s)': initiativeNames,
      'Estado': priority.status,
      '% Completado': priority.completionPercentage,
      'Semana Inicio': new Date(priority.weekStart).toLocaleDateString('es-MX'),
      'Semana Fin': new Date(priority.weekEnd).toLocaleDateString('es-MX'),
      'Reprogramada': priority.isCarriedOver ? 'Sí' : 'No',
      'Editado': priority.wasEdited ? 'Sí' : 'No',
      'Fecha Creación': new Date(priority.createdAt || priority.weekStart).toLocaleDateString('es-MX')
    };
  });

  // Ordenar por área, luego por usuario
  data.sort((a, b) => {
    if (a['Área'] === b['Área']) {
      return a['Usuario'].localeCompare(b['Usuario']);
    }
    // "Sin Área Asignada" al final
    if (a['Área'] === 'Sin Área Asignada') return 1;
    if (b['Área'] === 'Sin Área Asignada') return -1;
    return a['Área'].localeCompare(b['Área']);
  });

  return exportToExcel(data, fileName, 'Prioridades por Área');
};
