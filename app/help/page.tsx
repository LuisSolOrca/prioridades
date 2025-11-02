'use client';

import { Printer, BookOpen } from 'lucide-react';

export default function HelpPage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Solo visible en pantalla, no en impresión */}
      <div className="print:hidden bg-blue-600 text-white p-6 sticky top-0 z-10 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen size={32} />
            <div>
              <h1 className="text-2xl font-bold">Manual de Usuario</h1>
              <p className="text-blue-100">Sistema de Gestión de Prioridades</p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition"
          >
            <Printer size={20} />
            Imprimir PDF
          </button>
        </div>
      </div>

      {/* Contenido del Manual */}
      <div className="max-w-5xl mx-auto p-8 print:p-0">
        {/* Portada */}
        <div className="text-center mb-12 print:page-break-after">
          <h1 className="text-5xl font-bold text-blue-600 mb-4">Manual de Usuario</h1>
          <h2 className="text-3xl text-gray-700 mb-8">Sistema de Gestión de Prioridades Semanales</h2>
          <div className="text-gray-500 mt-12">
            <p className="text-lg">Versión 1.0</p>
            <p>{new Date().getFullYear()}</p>
          </div>
        </div>

        {/* Índice */}
        <div className="mb-12 print:page-break-after">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            Índice
          </h2>
          <div className="space-y-2 text-lg">
            <div className="flex justify-between"><span>1. Introducción</span><span>3</span></div>
            <div className="flex justify-between pl-4"><span>1.1 ¿Qué es el sistema?</span><span>3</span></div>
            <div className="flex justify-between pl-4"><span>1.2 Conceptos clave</span><span>3</span></div>
            <div className="flex justify-between"><span>2. Inicio de sesión</span><span>4</span></div>
            <div className="flex justify-between"><span>3. Dashboard Principal</span><span>5</span></div>
            <div className="flex justify-between"><span>4. Gestión de Prioridades</span><span>6</span></div>
            <div className="flex justify-between pl-4"><span>4.1 Crear prioridad</span><span>6</span></div>
            <div className="flex justify-between pl-4"><span>4.2 Editar prioridad</span><span>7</span></div>
            <div className="flex justify-between pl-4"><span>4.3 Estados de prioridad</span><span>7</span></div>
            <div className="flex justify-between pl-4"><span>4.4 Vista Kanban</span><span>8</span></div>
            <div className="flex justify-between"><span>5. Analíticas y Reportes</span><span>9</span></div>
            <div className="flex justify-between"><span>6. Gamificación</span><span>10</span></div>
            <div className="flex justify-between pl-4"><span>6.1 Sistema de puntos</span><span>10</span></div>
            <div className="flex justify-between pl-4"><span>6.2 Badges y logros</span><span>11</span></div>
            <div className="flex justify-between pl-4"><span>6.3 Leaderboard</span><span>12</span></div>
            <div className="flex justify-between"><span>7. Inteligencia Artificial</span><span>13</span></div>
            <div className="flex justify-between"><span>8. Automatizaciones (Workflows)</span><span>14</span></div>
            <div className="flex justify-between"><span>9. Funciones de Líder de Área</span><span>15</span></div>
            <div className="flex justify-between"><span>10. Funciones de Administrador</span><span>16</span></div>
            <div className="flex justify-between"><span>11. Preguntas Frecuentes</span><span>17</span></div>
          </div>
        </div>

        {/* 1. Introducción */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            1. Introducción
          </h2>

          <h3 className="text-2xl font-semibold text-gray-700 mb-4">1.1 ¿Qué es el sistema?</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            El Sistema de Gestión de Prioridades es una plataforma diseñada para ayudar a equipos y organizaciones
            a gestionar sus prioridades semanales de manera efectiva, alineándolas con iniciativas estratégicas.
          </p>
          <p className="text-gray-700 mb-6 leading-relaxed">
            El sistema trabaja en ciclos semanales (lunes a viernes) y permite a cada usuario definir hasta 5
            prioridades por semana, hacer seguimiento de su progreso, y recibir reconocimientos por su desempeño.
          </p>

          <h3 className="text-2xl font-semibold text-gray-700 mb-4">1.2 Conceptos clave</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li><strong>Prioridad:</strong> Una tarea o proyecto importante que debe completarse durante la semana</li>
            <li><strong>Iniciativa Estratégica:</strong> Objetivo organizacional de alto nivel al que se alinean las prioridades</li>
            <li><strong>Estado:</strong> Indicador del progreso de una prioridad (EN_TIEMPO, EN_RIESGO, BLOQUEADO, COMPLETADO)</li>
            <li><strong>Porcentaje de Completado:</strong> Medida numérica (0-100%) del avance de una prioridad</li>
            <li><strong>Semana Laboral:</strong> Período de lunes a viernes en el que se trabajan las prioridades</li>
            <li><strong>Badge:</strong> Logro o reconocimiento otorgado por completar ciertos hitos</li>
            <li><strong>Puntos:</strong> Sistema de gamificación que recompensa el buen desempeño</li>
          </ul>
        </section>

        {/* 2. Inicio de sesión */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            2. Inicio de sesión
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Para acceder al sistema, necesitas credenciales proporcionadas por tu administrador.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
            <h4 className="font-semibold text-blue-800 mb-2">Pasos para iniciar sesión:</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Ingresa tu correo electrónico corporativo</li>
              <li>Ingresa tu contraseña</li>
              <li>Haz clic en "Iniciar Sesión"</li>
            </ol>
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <p className="text-yellow-800">
              <strong>Nota:</strong> Si olvidaste tu contraseña, contacta al administrador del sistema.
              Puedes cambiar tu contraseña desde tu perfil una vez que hayas iniciado sesión.
            </p>
          </div>
        </section>

        {/* 3. Dashboard Principal */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            3. Dashboard Principal
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            El Dashboard es tu página principal donde visualizas tus prioridades de la semana actual.
          </p>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Elementos del Dashboard:</h3>
          <ul className="list-disc list-inside space-y-3 text-gray-700 mb-6">
            <li><strong>Navegación de Semanas:</strong> Botones para cambiar entre semanas (anterior/actual/siguiente)</li>
            <li><strong>Consejo del Sistema:</strong> Banner con tips motivacionales y tu progreso</li>
            <li><strong>Estadísticas:</strong> Resumen de tus prioridades (total, completadas, en riesgo, bloqueadas)</li>
            <li><strong>Lista de Prioridades:</strong> Tus 5 prioridades de la semana con su estado y progreso</li>
            <li><strong>Botones de Acción:</strong> Crear nueva prioridad, ver detalles, editar</li>
            <li><strong>Exportación:</strong> Exportar a Excel, PowerPoint o PDF</li>
          </ul>

          <div className="bg-green-50 border-l-4 border-green-600 p-4">
            <h4 className="font-semibold text-green-800 mb-2">Tip Pro:</h4>
            <p className="text-gray-700">
              Usa el botón "Semana Actual" para regresar rápidamente a la semana en curso.
              El sistema te muestra un indicador visual de qué semana estás viendo.
            </p>
          </div>
        </section>

        {/* 4. Gestión de Prioridades */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            4. Gestión de Prioridades
          </h2>

          <h3 className="text-2xl font-semibold text-gray-700 mb-4">4.1 Crear prioridad</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Puedes crear hasta 5 prioridades por semana. Para crear una prioridad:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
            <li>Ve a la página "Prioridades" o haz clic en "➕ Nueva Prioridad" desde el Dashboard</li>
            <li>Completa el formulario:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li><strong>Título:</strong> Nombre descriptivo de la prioridad (máx. 200 caracteres)</li>
                <li><strong>Descripción:</strong> Detalles adicionales (opcional)</li>
                <li><strong>Iniciativas:</strong> Selecciona una o más iniciativas estratégicas</li>
                <li><strong>Semana:</strong> Selecciona la semana (actual o siguiente)</li>
                <li><strong>Lista de verificación:</strong> Agrega tareas específicas (opcional)</li>
                <li><strong>Enlaces de evidencia:</strong> URLs de documentos o recursos (opcional)</li>
              </ul>
            </li>
            <li>Haz clic en "Crear Prioridad"</li>
          </ol>

          <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-6">
            <h4 className="font-semibold text-purple-800 mb-2">Usa IA para mejorar tu texto:</h4>
            <p className="text-gray-700">
              Haz clic en el botón "✨" junto al título o descripción para que la IA sugiera mejoras.
            </p>
          </div>

          <h3 className="text-2xl font-semibold text-gray-700 mb-4">4.2 Editar prioridad</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Puedes editar cualquier prioridad haciendo clic en el ícono de lupa 🔍 y luego en "Editar".
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Actualiza el estado (EN_TIEMPO, EN_RIESGO, BLOQUEADO, COMPLETADO)</li>
            <li>Modifica el porcentaje de completado (slider de 0-100%)</li>
            <li>Marca tareas de la lista de verificación como completadas</li>
            <li>Agrega comentarios para documentar el progreso</li>
            <li>Cambia la semana si necesitas reprogramar</li>
          </ul>

          <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6">
            <h4 className="font-semibold text-red-800 mb-2">Importante:</h4>
            <p className="text-gray-700">
              Si cambias la semana de una prioridad que NO está completada, se creará una copia para la nueva semana
              y la original se marcará como REPROGRAMADO. Esto permite mantener un historial preciso.
            </p>
          </div>

          <h3 className="text-2xl font-semibold text-gray-700 mb-4">4.3 Estados de prioridad</h3>
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">EN_TIEMPO</div>
              <p className="text-gray-700 flex-1">La prioridad va según lo planeado, sin problemas.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">EN_RIESGO</div>
              <p className="text-gray-700 flex-1">Existen obstáculos o retrasos que podrían afectar la entrega.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">BLOQUEADO</div>
              <p className="text-gray-700 flex-1">No se puede avanzar debido a impedimentos externos o internos.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">COMPLETADO</div>
              <p className="text-gray-700 flex-1">La prioridad se terminó exitosamente (automáticamente al 100%).</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">REPROGRAMADO</div>
              <p className="text-gray-700 flex-1">La prioridad se movió a otra semana (automático).</p>
            </div>
          </div>

          <h3 className="text-2xl font-semibold text-gray-700 mb-4">4.4 Vista Kanban</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            La vista Kanban te permite visualizar tus prioridades en un tablero estilo Trello:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Accede desde el menú lateral: "Vista Kanban"</li>
            <li>Las prioridades se agrupan por estado en columnas</li>
            <li>Arrastra y suelta prioridades entre columnas para cambiar su estado</li>
            <li>Vista rápida de todas tus prioridades organizadas visualmente</li>
          </ul>
        </section>

        {/* 5. Analíticas y Reportes */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            5. Analíticas y Reportes
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            La sección de Analíticas te proporciona métricas detalladas sobre tu desempeño:
          </p>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Métricas disponibles:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li><strong>Tasa de completado:</strong> Porcentaje de prioridades completadas vs. total</li>
            <li><strong>Distribución por estado:</strong> Gráfico circular de estados de prioridades</li>
            <li><strong>Distribución por iniciativa:</strong> Cuántas prioridades por iniciativa estratégica</li>
            <li><strong>Progreso promedio:</strong> Porcentaje de avance promedio de todas tus prioridades</li>
            <li><strong>Rendimiento por área:</strong> Comparación de desempeño entre áreas (si aplica)</li>
            <li><strong>Top performers:</strong> Usuarios con mejor desempeño del mes</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Análisis con IA:</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Haz clic en "Obtener Análisis IA" para recibir un análisis inteligente de tu organización:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Identifica patrones y tendencias</li>
            <li>Detecta áreas de mejora</li>
            <li>Recomienda acciones específicas</li>
            <li>Compara con períodos anteriores</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Exportación de reportes:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li><strong>Excel:</strong> Tabla detallada de todas las prioridades</li>
            <li><strong>PowerPoint:</strong> Presentación ejecutiva con gráficos y insights de IA</li>
            <li><strong>PDF:</strong> Reporte imprimible para archivo</li>
          </ul>
        </section>

        {/* 6. Gamificación */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            6. Gamificación
          </h2>

          <h3 className="text-2xl font-semibold text-gray-700 mb-4">6.1 Sistema de puntos</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            El sistema recompensa el buen desempeño y penaliza los riesgos:
          </p>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4 mb-4">
            <h4 className="font-bold text-green-800 mb-3">Formas de ganar puntos:</h4>
            <ul className="space-y-2 text-gray-700">
              <li>✅ Prioridad completada: <strong>+4 puntos</strong></li>
              <li>📊 Primera visita a Analytics: <strong>+2 puntos</strong></li>
              <li>🤖 Usar mejora de texto con IA: <strong>+1 punto</strong></li>
              <li>📑 Generar reporte: <strong>+1 punto</strong></li>
              <li>📊 Exportar a Excel: <strong>+1 punto</strong></li>
              <li>🎨 Usar vista Kanban: <strong>+1 punto</strong></li>
              <li>📈 Usar análisis IA: <strong>+2 puntos</strong></li>
              <li>🎤 Exportar a PowerPoint: <strong>+2 puntos</strong></li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <h4 className="font-bold text-red-800 mb-3">Penalizaciones:</h4>
            <ul className="space-y-2 text-gray-700">
              <li>⚠️ Prioridad EN_RIESGO: <strong>-6 puntos</strong> por semana</li>
              <li>🚫 Prioridad BLOQUEADO: <strong>-6 puntos</strong> por semana</li>
              <li>🔄 Prioridad REPROGRAMADO: <strong>-6 puntos</strong></li>
            </ul>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
            <h4 className="font-semibold text-blue-800 mb-2">Nota importante:</h4>
            <p className="text-gray-700">
              Los puntos se calculan mensualmente (últimas 4 semanas). Al inicio de cada mes,
              comienza un nuevo período de competencia.
            </p>
          </div>

          <h3 className="text-2xl font-semibold text-gray-700 mb-4">6.2 Badges y logros</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Desbloquea hasta 24 badges diferentes al usar las funcionalidades de la plataforma:
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-800 mb-2">🏆 Primera Victoria</h5>
              <p className="text-sm text-gray-600">Completa tu primera prioridad</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-800 mb-2">🔥 Racha de Fuego</h5>
              <p className="text-sm text-gray-600">5 semanas consecutivas al 100%</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-800 mb-2">🎯 Perfeccionista</h5>
              <p className="text-sm text-gray-600">10 prioridades completadas al 100%</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-800 mb-2">📊 Analista</h5>
              <p className="text-sm text-gray-600">Visita Analytics 10 veces</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-800 mb-2">🤖 Asistente IA</h5>
              <p className="text-sm text-gray-600">Usa IA 25 veces</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-800 mb-2">🎨 Maestro Kanban</h5>
              <p className="text-sm text-gray-600">Usa Kanban 20 veces</p>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed">
            Consulta tu colección completa de badges en la página del Leaderboard.
          </p>

          <h3 className="text-2xl font-semibold text-gray-700 mb-4 mt-6">6.3 Leaderboard</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            El Leaderboard muestra el ranking mensual de todos los usuarios:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Top 10 usuarios con más puntos del mes actual</li>
            <li>Tu posición y puntos destacados</li>
            <li>Racha actual y más larga de cada usuario</li>
            <li>Badges desbloqueados</li>
            <li>Filtros por área (si aplica)</li>
          </ul>
        </section>

        {/* 7. Inteligencia Artificial */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            7. Inteligencia Artificial
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            El sistema incluye capacidades de IA para ayudarte a mejorar tu trabajo:
          </p>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Mejora de títulos y descripciones:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
            <li>Al crear o editar una prioridad, haz clic en el botón "✨" junto al título o descripción</li>
            <li>La IA analizará tu texto y sugerirá mejoras</li>
            <li>Revisa las sugerencias y aplícalas si te parecen adecuadas</li>
            <li>Puedes rechazar las sugerencias y mantener tu texto original</li>
          </ol>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Análisis organizacional:</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Desde la página de Analytics, solicita un análisis completo:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Identifica patrones de desempeño</li>
            <li>Detecta áreas críticas que requieren atención</li>
            <li>Sugiere acciones correctivas específicas</li>
            <li>Compara tendencias entre períodos</li>
            <li>Analiza distribución de carga de trabajo</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Insights en presentaciones:</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Al exportar a PowerPoint, la IA genera automáticamente:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Resumen ejecutivo del período</li>
            <li>Hallazgos clave y métricas destacadas</li>
            <li>Recomendaciones estratégicas</li>
            <li>Análisis por usuario o área</li>
          </ul>
        </section>

        {/* 8. Automatizaciones (Workflows) */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            8. Automatizaciones (Workflows)
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Los workflows permiten automatizar acciones basadas en eventos:
          </p>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Disparadores (Triggers):</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li>Cuando se crea una prioridad</li>
            <li>Cuando se actualiza una prioridad</li>
            <li>Cuando cambia el estado</li>
            <li>Cuando está atrasada</li>
            <li>Cuando el porcentaje es bajo</li>
            <li>Cuando se reasigna a otro usuario</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Condiciones:</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Define cuándo debe ejecutarse el workflow:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li>Si el estado es igual a...</li>
            <li>Si el estado lleva X días...</li>
            <li>Si el % completado es menor que...</li>
            <li>Si el usuario es...</li>
            <li>Si la iniciativa es...</li>
            <li>Y muchas más condiciones</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Acciones:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li><strong>Enviar notificación:</strong> Al dueño, admin o usuario específico</li>
            <li><strong>Enviar email:</strong> Con mensaje personalizado</li>
            <li><strong>Cambiar estado:</strong> Automáticamente</li>
            <li><strong>Reasignar:</strong> A otro usuario</li>
            <li><strong>Agregar comentario:</strong> Nota automática en la prioridad</li>
          </ul>

          <div className="bg-purple-50 border-l-4 border-purple-600 p-4">
            <h4 className="font-semibold text-purple-800 mb-2">Ejemplo de uso:</h4>
            <p className="text-gray-700">
              "Cuando una prioridad esté en estado BLOQUEADO por más de 2 días, enviar notificación
              al admin con el mensaje: 'Prioridad bloqueada requiere atención urgente'"
            </p>
          </div>
        </section>

        {/* 9. Funciones de Líder de Área */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            9. Funciones de Líder de Área
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Si tienes el rol de líder de área, tendrás acceso a funcionalidades adicionales:
          </p>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Dashboard por Área:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Vista consolidada de todas las prioridades de tu área</li>
            <li>Filtros por usuario y estado</li>
            <li>Métricas agregadas del equipo</li>
            <li>Exportación de reportes por área</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Gestión de Área (Drag & Drop):</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Reasigna prioridades entre miembros de tu área de forma visual:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
            <li>Accede a "Gestión de Área" desde el menú</li>
            <li>Verás columnas con las prioridades de cada miembro del equipo</li>
            <li>Arrastra una prioridad de una columna a otra para reasignarla</li>
            <li>El cambio se guarda automáticamente</li>
            <li>Se ejecutan workflows configurados para reasignaciones</li>
          </ol>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
            <h4 className="font-semibold text-blue-800 mb-2">Vista de semanas:</h4>
            <p className="text-gray-700">
              La gestión de área muestra tanto la semana actual como la siguiente, con indicadores
              visuales de color azul y morado para distinguirlas.
            </p>
          </div>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Analíticas por área:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Rendimiento comparativo de tu área vs. otras</li>
            <li>Distribución de carga de trabajo</li>
            <li>Identificación de miembros que necesitan apoyo</li>
            <li>Tendencias y patrones del equipo</li>
          </ul>
        </section>

        {/* 10. Funciones de Administrador */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            10. Funciones de Administrador
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Los administradores tienen acceso completo al sistema:
          </p>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Gestión de Usuarios:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Crear, editar y desactivar usuarios</li>
            <li>Asignar roles (ADMIN o USER)</li>
            <li>Asignar áreas y designar líderes de área</li>
            <li>Restablecer contraseñas</li>
            <li>Ver historial de actividad</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Gestión de Iniciativas Estratégicas:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Crear y editar iniciativas</li>
            <li>Asignar colores y orden de visualización</li>
            <li>Activar/desactivar iniciativas</li>
            <li>Ver métricas por iniciativa</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Configuración de IA:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Personalizar prompts de IA para cada caso de uso</li>
            <li>Ajustar el tono y estilo de las sugerencias</li>
            <li>Configurar límites de uso</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Gestión de Workflows:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Crear workflows personalizados</li>
            <li>Editar workflows existentes</li>
            <li>Activar/desactivar workflows</li>
            <li>Ver historial de ejecuciones</li>
            <li>Monitorear errores</li>
          </ul>
        </section>

        {/* 11. Preguntas Frecuentes */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            11. Preguntas Frecuentes
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ¿Puedo tener más de 5 prioridades por semana?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                No. El sistema está diseñado para que te enfoques en un máximo de 5 prioridades
                por semana, promoviendo la concentración y la calidad sobre la cantidad.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ¿Qué pasa si no completo una prioridad en la semana?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Puedes reprogramarla para la siguiente semana editándola y cambiando las fechas.
                La original quedará marcada como REPROGRAMADO y se creará una copia nueva.
                Nota: Esto genera una penalización de -6 puntos.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ¿Cómo cambio mi contraseña?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Ve a tu Perfil (ícono de usuario en el menú) y selecciona "Cambiar Contraseña".
                Ingresa tu contraseña actual y la nueva contraseña dos veces.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ¿Los puntos y badges se reinician?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Los puntos del leaderboard se calculan mensualmente (últimas 4 semanas), pero
                tus badges son permanentes. Al inicio de cada mes, todos comienzan con 0 puntos
                mensuales para una competencia justa.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ¿Puedo ver las prioridades de otros usuarios?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Los usuarios normales solo ven sus propias prioridades. Los líderes de área pueden
                ver las prioridades de su equipo. Los administradores tienen acceso a todas las prioridades.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ¿Cómo funcionan las notificaciones?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                El sistema envía notificaciones in-app (campana en el menú) para eventos importantes
                como cambios de estado, menciones en comentarios, y ejecuciones de workflows.
                Los administradores pueden configurar también notificaciones por email.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ¿Qué navegadores son compatibles?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                El sistema funciona mejor en Chrome, Firefox, Safari y Edge en sus versiones más recientes.
                Se recomienda mantener el navegador actualizado para la mejor experiencia.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ¿Necesito conexión a internet?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Sí, el sistema requiere conexión a internet activa para funcionar, ya que todos los
                datos se sincronizan en tiempo real con el servidor.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-12 pt-6 border-t">
          <p>Sistema de Gestión de Prioridades • Versión 1.0</p>
          <p className="mt-2">Para soporte técnico, contacta a tu administrador del sistema</p>
        </div>
      </div>
    </div>
  );
}
