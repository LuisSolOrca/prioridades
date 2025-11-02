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
    const user = users.find(u => u._id === priority.userId);
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
