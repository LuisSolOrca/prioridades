'use client';

import { Printer, BookOpen } from 'lucide-react';
import Image from 'next/image';

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
            <Image src="/orca-logo.png" alt="Orca Logo" width={40} height={40} className="bg-white rounded-lg p-1" />
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
          <div className="mb-8">
            <Image
              src="/orca-logo.png"
              alt="Orca Logo"
              width={120}
              height={120}
              className="mx-auto"
            />
          </div>
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
            <div className="flex justify-between"><span>5. Comentarios y Colaboración</span><span>9</span></div>
            <div className="flex justify-between"><span>6. Notificaciones</span><span>10</span></div>
            <div className="flex justify-between"><span>7. Historial</span><span>11</span></div>
            <div className="flex justify-between"><span>8. Perfil de Usuario</span><span>12</span></div>
            <div className="flex justify-between"><span>9. Analíticas y Reportes</span><span>13</span></div>
            <div className="flex justify-between"><span>10. Dashboard por Área</span><span>14</span></div>
            <div className="flex justify-between"><span>11. Gamificación</span><span>15</span></div>
            <div className="flex justify-between pl-4"><span>11.1 Sistema de puntos</span><span>15</span></div>
            <div className="flex justify-between pl-4"><span>11.2 Badges y logros</span><span>16</span></div>
            <div className="flex justify-between pl-4"><span>11.3 Leaderboard</span><span>17</span></div>
            <div className="flex justify-between"><span>12. Inteligencia Artificial</span><span>18</span></div>
            <div className="flex justify-between"><span>13. Automatizaciones (Workflows)</span><span>19</span></div>
            <div className="flex justify-between"><span>14. Funciones de Líder de Área</span><span>20</span></div>
            <div className="flex justify-between"><span>15. Funciones de Administrador</span><span>21</span></div>
            <div className="flex justify-between"><span>16. Preguntas Frecuentes</span><span>22</span></div>
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
            <li><strong>Área:</strong> Departamento o equipo organizacional al que pertenece un usuario</li>
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

        {/* 5. Comentarios y Colaboración */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            5. Comentarios y Colaboración
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Cada prioridad tiene una sección de comentarios donde puedes documentar avances, obstáculos y colaborar con tu equipo.
          </p>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Agregar comentarios:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
            <li>Abre los detalles de una prioridad</li>
            <li>Desplázate hacia abajo hasta la sección de comentarios</li>
            <li>Escribe tu comentario en el campo de texto</li>
            <li>Haz clic en "Publicar Comentario"</li>
          </ol>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Menciones (@):</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Puedes mencionar a otros usuarios escribiendo @ seguido del nombre:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Escribe <code className="bg-gray-100 px-2 py-1 rounded">@nombre</code> en tu comentario</li>
            <li>El usuario mencionado recibirá una notificación</li>
            <li>Las menciones aparecen resaltadas en azul</li>
            <li>Útil para solicitar ayuda o compartir información relevante</li>
          </ul>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Buenas prácticas:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Documenta cambios importantes en los comentarios</li>
              <li>Explica por qué una prioridad está bloqueada o en riesgo</li>
              <li>Menciona a líderes o compañeros cuando necesites su input</li>
              <li>Usa comentarios para celebrar logros del equipo</li>
            </ul>
          </div>
        </section>

        {/* 6. Notificaciones */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            6. Notificaciones
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            El sistema envía notificaciones para mantenerte informado de eventos importantes.
          </p>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Acceder a notificaciones:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Haz clic en el ícono de campana 🔔 en el menú superior</li>
            <li>Se desplegará un panel con tus notificaciones recientes</li>
            <li>Las notificaciones no leídas aparecen resaltadas</li>
            <li>Haz clic en una notificación para ver más detalles</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Tipos de notificaciones:</h3>
          <div className="space-y-3 mb-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-800">Cambios de estado</h4>
              <p className="text-gray-700 text-sm">Te notifican cuando una de tus prioridades cambia de estado</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold text-gray-800">Menciones</h4>
              <p className="text-gray-700 text-sm">Te alertan cuando alguien te menciona en un comentario</p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-semibold text-gray-800">Hitos de progreso</h4>
              <p className="text-gray-700 text-sm">Te felicitan al alcanzar 25%, 50%, 75% o 100% de completado</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold text-gray-800">Semana completada</h4>
              <p className="text-gray-700 text-sm">Te notifican cuando completas todas tus prioridades de la semana</p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h4 className="font-semibold text-gray-800">Automatizaciones</h4>
              <p className="text-gray-700 text-sm">Te informan cuando se ejecutan workflows configurados</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-semibold text-gray-800">Reasignaciones</h4>
              <p className="text-gray-700 text-sm">Te avisan cuando un líder de área te asigna o reasigna una prioridad</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Gestionar notificaciones:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Haz clic en "Marcar todas como leídas" para limpiar el contador</li>
            <li>Elimina notificaciones individuales con el ícono de basura</li>
            <li>Las notificaciones antiguas se eliminan automáticamente después de 30 días</li>
          </ul>
        </section>

        {/* 7. Historial */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            7. Historial
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            La página de Historial te permite revisar todas tus prioridades pasadas y analizar tu desempeño histórico.
          </p>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Acceder al historial:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Ve a "Historial" desde el menú lateral</li>
            <li>Verás una lista de todas tus prioridades, organizadas cronológicamente</li>
            <li>Las prioridades más recientes aparecen primero</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Filtros disponibles:</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-800 mb-2">Por usuario</h5>
              <p className="text-sm text-gray-600">Filtra para ver prioridades de un usuario específico (admins)</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-800 mb-2">Por estado</h5>
              <p className="text-sm text-gray-600">Muestra solo prioridades con cierto estado</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-800 mb-2">Por iniciativa</h5>
              <p className="text-sm text-gray-600">Filtra por iniciativa estratégica</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-800 mb-2">Por rango de fechas</h5>
              <p className="text-sm text-gray-600">Selecciona un período específico</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Usos del historial:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Revisar qué trabajaste en semanas pasadas</li>
            <li>Analizar patrones de completado vs. reprogramado</li>
            <li>Encontrar información o evidencia de proyectos anteriores</li>
            <li>Preparar reportes de actividades para revisiones</li>
            <li>Identificar áreas de mejora en tu gestión del tiempo</li>
          </ul>
        </section>

        {/* 8. Perfil de Usuario */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            8. Perfil de Usuario
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            En tu perfil puedes ver tu información personal y cambiar tu contraseña.
          </p>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Acceder a tu perfil:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Haz clic en el ícono de usuario 👤 en el menú lateral</li>
            <li>Selecciona "Perfil" del menú desplegable</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Información del perfil:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li><strong>Nombre:</strong> Tu nombre completo</li>
            <li><strong>Email:</strong> Tu correo electrónico corporativo</li>
            <li><strong>Rol:</strong> ADMIN o USER</li>
            <li><strong>Área:</strong> Tu departamento o equipo (si aplica)</li>
            <li><strong>Estado:</strong> Activo/Inactivo</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Cambiar contraseña:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
            <li>En tu perfil, busca la sección "Cambiar Contraseña"</li>
            <li>Ingresa tu contraseña actual</li>
            <li>Ingresa tu nueva contraseña (mínimo 6 caracteres)</li>
            <li>Confirma la nueva contraseña</li>
            <li>Haz clic en "Actualizar Contraseña"</li>
          </ol>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">Seguridad:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Usa una contraseña fuerte y única</li>
              <li>No compartas tu contraseña con nadie</li>
              <li>Cambia tu contraseña regularmente</li>
              <li>Si sospechas que tu cuenta fue comprometida, cambia tu contraseña inmediatamente</li>
            </ul>
          </div>
        </section>

        {/* 9. Analíticas y Reportes */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            9. Analíticas y Reportes
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            La sección de Analíticas te proporciona métricas detalladas sobre tu desempeño y el de tu organización.
          </p>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Métricas personales:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li><strong>Tasa de completado:</strong> Porcentaje de prioridades completadas vs. total</li>
            <li><strong>Distribución por estado:</strong> Gráfico circular de estados de prioridades</li>
            <li><strong>Distribución por iniciativa:</strong> Cuántas prioridades por iniciativa estratégica</li>
            <li><strong>Progreso promedio:</strong> Porcentaje de avance promedio de todas tus prioridades</li>
            <li><strong>Tendencia semanal:</strong> Evolución de tu desempeño en las últimas semanas</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Métricas organizacionales (Admins):</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li><strong>Top performers:</strong> Usuarios con mejor desempeño del mes</li>
            <li><strong>Rendimiento por área:</strong> Comparación de desempeño entre áreas</li>
            <li><strong>Prioridades críticas:</strong> Prioridades bloqueadas o en riesgo que requieren atención</li>
            <li><strong>Análisis de carga:</strong> Distribución de trabajo entre usuarios</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Análisis con IA:</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Haz clic en "Obtener Análisis IA" para recibir un análisis inteligente:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Identifica patrones y tendencias en tu organización</li>
            <li>Detecta áreas de mejora y oportunidades</li>
            <li>Recomienda acciones específicas basadas en datos</li>
            <li>Compara con períodos anteriores para identificar cambios</li>
            <li>Analiza correlaciones entre iniciativas y resultados</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Exportación de reportes:</h3>
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm font-semibold">Excel</div>
              <p className="text-gray-700 flex-1">Tabla detallada con todas las prioridades, ideal para análisis adicional</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded text-sm font-semibold">PowerPoint</div>
              <p className="text-gray-700 flex-1">Presentación ejecutiva con gráficos e insights de IA automáticos</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-semibold">PDF</div>
              <p className="text-gray-700 flex-1">Reporte imprimible para archivo o distribución</p>
            </div>
          </div>
        </section>

        {/* 10. Dashboard por Área */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            10. Dashboard por Área
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            El Dashboard por Área proporciona una vista consolidada del desempeño de un departamento específico.
          </p>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Acceso:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Líderes de área: Automáticamente ven su área asignada</li>
            <li>Administradores: Pueden seleccionar cualquier área desde un dropdown</li>
            <li>Accede desde "Dashboard por Área" en el menú lateral</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Información mostrada:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="font-semibold text-gray-800 mb-2">📊 Estadísticas del área</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Total de prioridades activas</li>
                <li>Tasa de completado del área</li>
                <li>Prioridades en riesgo o bloqueadas</li>
                <li>Progreso promedio</li>
              </ul>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="font-semibold text-gray-800 mb-2">👥 Miembros del equipo</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Lista de todos los miembros</li>
                <li>Prioridades por persona</li>
                <li>Estado de cada prioridad</li>
                <li>Progreso individual</li>
              </ul>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="font-semibold text-gray-800 mb-2">🎯 Distribución por iniciativa</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Gráfico de distribución</li>
                <li>Prioridades por iniciativa estratégica</li>
                <li>Alineación con objetivos</li>
                <li>Balance de carga</li>
              </ul>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="font-semibold text-gray-800 mb-2">📈 Tendencias</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Evolución semanal del área</li>
                <li>Comparación con periodos anteriores</li>
                <li>Identificación de patrones</li>
                <li>Alertas de riesgo</li>
              </ul>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Exportación por área:</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Puedes exportar reportes específicos del área:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Los reportes incluyen solo datos del área seleccionada</li>
            <li>PowerPoint genera insights de IA específicos del área</li>
            <li>Excel exporta con filtros pre-aplicados</li>
            <li>Útil para presentaciones a dirección o revisiones de equipo</li>
          </ul>
        </section>

        {/* 11. Gamificación */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            11. Gamificación
          </h2>

          <h3 className="text-2xl font-semibold text-gray-700 mb-4">11.1 Sistema de puntos</h3>
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
              comienza un nuevo período de competencia. Los puntos se recalculan dinámicamente,
              así que si una prioridad te es reasignada, los puntos se ajustan automáticamente.
            </p>
          </div>

          <h3 className="text-2xl font-semibold text-gray-700 mb-4">11.2 Badges y logros</h3>
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
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-800 mb-2">📈 Reportero</h5>
              <p className="text-sm text-gray-600">Genera 10 reportes</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-800 mb-2">💎 Power User</h5>
              <p className="text-sm text-gray-600">Desbloquea los 24 badges</p>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed mb-6">
            Consulta tu colección completa de badges en la página del Leaderboard.
            Los badges son permanentes y se mantienen incluso cuando cambia el mes.
          </p>

          <h3 className="text-2xl font-semibold text-gray-700 mb-4">11.3 Leaderboard</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            El Leaderboard muestra el ranking mensual de todos los usuarios:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Top 10 usuarios con más puntos del mes actual</li>
            <li>Tu posición y puntos destacados</li>
            <li>Racha actual y más larga de cada usuario</li>
            <li>Badges desbloqueados por cada usuario</li>
            <li>El ganador del mes recibe reconocimiento oficial</li>
          </ul>
        </section>

        {/* 12. Inteligencia Artificial */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            12. Inteligencia Artificial
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
            <li>Identifica patrones de desempeño en la organización</li>
            <li>Detecta áreas críticas que requieren atención inmediata</li>
            <li>Sugiere acciones correctivas específicas y priorizadas</li>
            <li>Compara tendencias entre períodos para identificar mejoras o deterioros</li>
            <li>Analiza distribución de carga de trabajo y balance entre áreas</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Insights en presentaciones:</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Al exportar a PowerPoint, la IA genera automáticamente:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Resumen ejecutivo del período seleccionado</li>
            <li>Hallazgos clave y métricas más destacadas</li>
            <li>Recomendaciones estratégicas basadas en datos</li>
            <li>Análisis por usuario o área (según el tipo de reporte)</li>
            <li>Identificación de riesgos y oportunidades</li>
          </ul>

          <div className="bg-purple-50 border-l-4 border-purple-600 p-4">
            <h4 className="font-semibold text-purple-800 mb-2">Privacidad:</h4>
            <p className="text-gray-700">
              La IA procesa tu información únicamente para generar sugerencias y análisis.
              Los datos no se comparten con terceros y permanecen en tu organización.
            </p>
          </div>
        </section>

        {/* 13. Automatizaciones (Workflows) */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            13. Automatizaciones (Workflows)
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Los workflows permiten automatizar acciones basadas en eventos del sistema.
          </p>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Disparadores (Triggers):</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li><strong>Prioridad creada:</strong> Cuando se crea una nueva prioridad</li>
            <li><strong>Prioridad actualizada:</strong> Cuando se edita una prioridad</li>
            <li><strong>Cambio de estado:</strong> Cuando una prioridad cambia de estado</li>
            <li><strong>Prioridad atrasada:</strong> Cuando no se completó a tiempo</li>
            <li><strong>Porcentaje bajo:</strong> Cuando el avance cae por debajo de un umbral</li>
            <li><strong>Prioridad reasignada:</strong> Cuando se asigna a otro usuario</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Condiciones:</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Define cuándo debe ejecutarse el workflow con condiciones específicas:
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-sm text-gray-700">• Estado es igual a...</div>
            <div className="text-sm text-gray-700">• Estado lleva X días...</div>
            <div className="text-sm text-gray-700">• % completado menor que...</div>
            <div className="text-sm text-gray-700">• % completado mayor que...</div>
            <div className="text-sm text-gray-700">• Usuario es...</div>
            <div className="text-sm text-gray-700">• Iniciativa es...</div>
            <div className="text-sm text-gray-700">• Título contiene...</div>
            <div className="text-sm text-gray-700">• Descripción contiene...</div>
            <div className="text-sm text-gray-700">• Nuevo usuario es... (reasignación)</div>
            <div className="text-sm text-gray-700">• Usuario anterior es... (reasignación)</div>
          </div>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Acciones:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li><strong>Enviar notificación:</strong> Al dueño, admin, líder de área o usuario específico</li>
            <li><strong>Enviar email:</strong> Con mensaje y asunto personalizados</li>
            <li><strong>Cambiar estado:</strong> Automáticamente actualizar el estado</li>
            <li><strong>Reasignar:</strong> Cambiar el responsable de la prioridad</li>
            <li><strong>Agregar comentario:</strong> Nota automática en la prioridad</li>
          </ul>

          <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-6">
            <h4 className="font-semibold text-purple-800 mb-2">Ejemplo práctico:</h4>
            <p className="text-gray-700 mb-2"><strong>Escenario:</strong> "Alertar al líder de área cuando una prioridad crítica esté bloqueada"</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><strong>Trigger:</strong> Cambio de estado</li>
              <li><strong>Condición 1:</strong> Estado es igual a BLOQUEADO</li>
              <li><strong>Condición 2:</strong> Iniciativa es igual a "Proyecto Crítico"</li>
              <li><strong>Acción 1:</strong> Enviar notificación al líder de área</li>
              <li><strong>Acción 2:</strong> Agregar comentario: "Requiere atención urgente del líder"</li>
            </ul>
          </div>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Crear un workflow:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
            <li>Ve a "Automatizaciones" en el menú</li>
            <li>Haz clic en "Nueva Automatización"</li>
            <li>Selecciona el trigger (evento que lo activará)</li>
            <li>Agrega condiciones (opcional pero recomendado)</li>
            <li>Define las acciones a ejecutar</li>
            <li>Activa o desactiva el workflow según necesites</li>
            <li>Guarda y el workflow empezará a funcionar automáticamente</li>
          </ol>
        </section>

        {/* 14. Funciones de Líder de Área */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            14. Funciones de Líder de Área
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Si tienes el rol de líder de área, tendrás acceso a funcionalidades adicionales para gestionar tu equipo.
          </p>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Gestión de Área (Drag & Drop):</h3>
          <p className="text-gray-700 mb-4 leading-relaxed">
            La herramienta más poderosa para líderes: reasignar prioridades de forma visual.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
            <li>Accede a "Gestión de Área" desde el menú lateral</li>
            <li>Verás columnas con las prioridades de cada miembro del equipo</li>
            <li>Cada columna representa a un usuario de tu área</li>
            <li>Las prioridades muestran indicadores visuales:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>Borde azul = Semana actual</li>
                <li>Borde morado = Próxima semana</li>
              </ul>
            </li>
            <li>Arrastra una prioridad de una columna a otra para reasignarla</li>
            <li>El cambio se guarda automáticamente</li>
            <li>Se ejecutan workflows configurados para reasignaciones</li>
            <li>Ambos usuarios (anterior y nuevo) reciben notificación</li>
          </ol>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
            <h4 className="font-semibold text-blue-800 mb-2">Responsive Grid:</h4>
            <p className="text-gray-700">
              La vista se adapta a tu pantalla mostrando hasta 5 columnas por fila. En pantallas
              pequeñas verás menos columnas, y puedes hacer scroll hacia abajo para ver más usuarios.
            </p>
          </div>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Dashboard por Área:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Vista consolidada de todas las prioridades de tu área</li>
            <li>Estadísticas agregadas del equipo</li>
            <li>Identificación rápida de prioridades en riesgo</li>
            <li>Distribución de carga de trabajo</li>
            <li>Exportación de reportes específicos del área</li>
            <li>Insights de IA para tu equipo</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Mejores prácticas:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Revisa el Dashboard por Área al inicio de cada semana</li>
            <li>Reasigna prioridades si detectas desbalance de carga</li>
            <li>Comunica cambios importantes a tu equipo</li>
            <li>Usa workflows para automatizar alertas de tu área</li>
            <li>Exporta reportes semanales para seguimiento</li>
            <li>Reconoce públicamente los logros del equipo</li>
          </ul>
        </section>

        {/* 15. Funciones de Administrador */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            15. Funciones de Administrador
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Los administradores tienen acceso completo al sistema y responsabilidad sobre su configuración.
          </p>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Gestión de Usuarios:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Crear nuevos usuarios con email y contraseña inicial</li>
            <li>Editar información de usuarios existentes</li>
            <li>Asignar roles (ADMIN o USER)</li>
            <li>Asignar áreas y designar líderes de área</li>
            <li>Activar/desactivar usuarios</li>
            <li>Restablecer contraseñas cuando sea necesario</li>
            <li>Ver historial de actividad de cualquier usuario</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Gestión de Iniciativas Estratégicas:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Crear nuevas iniciativas alineadas a objetivos organizacionales</li>
            <li>Editar nombre y descripción de iniciativas</li>
            <li>Asignar colores identificativos a cada iniciativa</li>
            <li>Definir orden de visualización</li>
            <li>Activar/desactivar iniciativas sin eliminar datos históricos</li>
            <li>Ver métricas de progreso por iniciativa</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Configuración de IA:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Personalizar prompts de IA para cada caso de uso:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>Mejora de títulos</li>
                <li>Mejora de descripciones</li>
                <li>Análisis organizacional</li>
                <li>Insights para PowerPoint</li>
                <li>Análisis por área</li>
              </ul>
            </li>
            <li>Ajustar el tono y estilo de las sugerencias</li>
            <li>Definir contexto organizacional específico</li>
            <li>Probar cambios antes de aplicarlos</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Gestión de Workflows:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Crear workflows personalizados para la organización</li>
            <li>Editar workflows existentes</li>
            <li>Activar/desactivar workflows sin eliminarlos</li>
            <li>Ver historial completo de ejecuciones</li>
            <li>Monitorear errores y problemas</li>
            <li>Configurar notificaciones por email (además de in-app)</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3">Acceso global:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Ver todas las prioridades de todos los usuarios</li>
            <li>Acceder a dashboards por área de cualquier departamento</li>
            <li>Generar reportes consolidados de toda la organización</li>
            <li>Ver analíticas globales y comparativas entre áreas</li>
            <li>Exportar datos completos para análisis externos</li>
          </ul>
        </section>

        {/* 16. Preguntas Frecuentes */}
        <section className="mb-12 print:page-break-before">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-4 border-blue-600 pb-2">
            16. Preguntas Frecuentes
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

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ¿Qué pasa con mis puntos cuando me reasignan una prioridad?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Los puntos se recalculan dinámicamente. Si un líder de área te reasigna una prioridad,
                los puntos asociados a esa prioridad se transfieren automáticamente entre usuarios.
                Esto asegura que los puntos siempre reflejen tu trabajo actual.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ¿Puedo exportar datos personales?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Sí, puedes exportar tus prioridades a Excel, PowerPoint o PDF desde el Dashboard
                o la página de Analíticas. Los administradores pueden exportar datos de toda la organización.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-12 pt-6 border-t">
          <div className="mb-4">
            <Image
              src="/orca-logo.png"
              alt="Orca Logo"
              width={60}
              height={60}
              className="mx-auto opacity-50"
            />
          </div>
          <p>Sistema de Gestión de Prioridades • Versión 1.0</p>
          <p className="mt-2">Para soporte técnico, contacta a tu administrador del sistema</p>
        </div>
      </div>
    </div>
  );
}
