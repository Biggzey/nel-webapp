import React, { createContext, useContext, useState, useEffect } from 'react';

// Define translations
const translations = {
  en: {
    settings: {
      profile: 'Profile',
      preferences: 'Preferences',
      theme: 'Theme',
      system: 'System',
      light: 'Light',
      dark: 'Dark',
      language: 'Language',
      chatColor: 'Chat Bubble Color',
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      profileUpdated: 'Profile updated successfully',
      preferencesUpdated: 'Preferences updated successfully'
    },
    profile: {
      username: 'Username',
      displayName: 'Display Name',
      uploadPicture: 'Click to upload a new profile picture',
      enterUsername: 'Enter your username',
      enterDisplayName: 'Enter your display name',
      profilePicture: 'Profile Picture',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      passwordChanged: 'Password updated successfully',
      passwordMismatch: 'New passwords do not match',
      invalidCurrentPassword: 'Current password is incorrect'
    },
    chat: {
      sendMessage: 'Send message',
      typeMessage: 'Type your message...',
      loading: 'Loading messages...',
      noMessages: 'No messages yet. Start a conversation!',
      clearChat: 'Clear Chat',
      confirmClear: 'Are you sure you want to clear this conversation? This cannot be undone.',
      chatCleared: 'Chat history cleared successfully',
      noCharacterSelected: 'No character selected. Please select a character first.',
      messageTooLong: 'Message is too long. Please keep it under 2000 characters.',
      addReaction: 'Add reaction'
    },
    character: {
      new: 'New Character',
      edit: 'Edit Character',
      details: 'Character Details',
      personality: {
        title: 'Personality Configuration',
        traits: 'Personality',
        traitsPlaceholder: "Describe the character's core personality traits and behaviors...",
        traitsHelp: "Define the character's personality traits, mannerisms, and general behavior patterns.",
        backstory: 'Backstory',
        backstoryPlaceholder: "Write the character's background story and history...",
        backstoryHelp: "Provide background information that shapes the character's perspective and responses.",
        systemPrompt: 'System Prompt',
        systemPromptPlaceholder: 'Define the core personality and role of your character...',
        systemPromptHelp: "This is the initial system message that defines your character's core personality and behavior.",
        customInstructions: 'Custom Instructions',
        customInstructionsPlaceholder: 'Add any additional instructions or guidelines...',
        customInstructionsHelp: 'Additional instructions that will be appended to the system message to further customize behavior.'
      },
      fields: {
        name: 'Name',
        namePlaceholder: 'Character name',
        age: 'Age',
        agePlaceholder: 'Age',
        gender: 'Gender',
        genderPlaceholder: 'Gender',
        race: 'Race',
        racePlaceholder: 'Race/Species',
        occupation: 'Occupation',
        occupationPlaceholder: "Character's role",
        likes: 'Likes',
        likesPlaceholder: 'Enter likes separated by commas (e.g., cats, reading, coffee)',
        dislikes: 'Dislikes',
        dislikesPlaceholder: 'Enter dislikes separated by commas (e.g., rain, loud noises, spiders)',
        avatar: 'Avatar URL or Upload',
        avatarPlaceholder: 'https://example.com/avatar.png',
        fullImage: 'Full-Body Image URL or Upload',
        fullImagePlaceholder: 'https://example.com/full.png'
      },
      actions: {
        resetDefaults: 'Reset to Defaults',
        upload: 'Upload',
        save: 'Save',
        cancel: 'Cancel'
      },
      metadata: {
        yearsOld: 'years old'
      },
      delete: 'Delete Character',
      deleted: 'Character deleted.',
      deleteFailed: 'Failed to delete character.',
      confirmDelete: 'Are you sure you want to delete this character? This cannot be undone.'
    },
    sidebar: {
      characters: 'Characters',
      settings: 'Settings',
      newCharacter: 'New Character',
      search: 'Search characters...'
    },
    common: {
      create: 'Create',
      delete: 'Delete',
      cancel: 'Cancel',
      save: 'Save',
      edit: 'Edit',
      loading: 'Loading...',
      error: 'Something went wrong',
      refresh: 'Refresh Page',
      goHome: 'Go to Home',
      logout: 'Logout'
    },
    errors: {
      required: 'This field is required',
      invalidEmail: 'Invalid email address',
      passwordMismatch: 'Passwords do not match',
      invalidCredentials: 'Invalid email or password',
      serverError: 'Server error occurred',
      unexpectedError: 'We\'re sorry, but something unexpected happened. Please try refreshing the page.'
    },
    admin: {
      title: 'Admin Panel',
      searchUsers: 'Search users...',
      backToHome: 'Back to Home',
      systemOverview: 'System Overview',
      users: 'Users',
      messages: 'Messages',
      characters: 'Characters',
      stats: 'Stats',
      recentActivity: 'Recent Activity',
      role: 'Role',
      status: 'Status',
      joined: 'Joined',
      lastLogin: 'Last Login',
      totalMessages: 'Total Messages',
      charactersCreated: 'Characters Created',
      activeSessions: 'Active Sessions',
      blocked: 'Blocked',
      online: 'Online',
      offline: 'Offline',
      resetPassword: 'Reset Password',
      blockUser: 'Block User',
      unblockUser: 'Unblock User',
      deleteUser: 'Delete User',
      activityStats: 'Activity Stats',
      basicInfo: 'Basic Information',
      activity: 'Activity',
      systemStats: 'System Stats',
      createdToday: 'Created Today',
      avgPerUser: 'Avg. Per User',
      newToday: 'New Today',
      activeNow: 'Active Now',
      avgMessagesPerUser: 'Avg. Per User',
      systemActivity: 'Recent System Activity',
      removeDuplicatesAll: 'Remove Duplicate Nelliel Characters (All)',
      removeDuplicatesUser: 'Remove Duplicate Nelliel Characters (User)',
      duplicatesRemoved: 'Removed %{count} duplicate Nelliel characters.',
      noDuplicatesFound: 'No duplicate Nelliel characters found.',
      duplicateCleanupFailed: 'Failed to clean up duplicates: %{error}',
      SUPER_ADMIN: 'Super Admin',
      USER: 'User',
      MODERATOR: 'Moderator',
      ADMIN: 'Admin'
    }
  },
  es: {
    settings: {
      profile: 'Perfil',
      preferences: 'Preferencias',
      theme: 'Tema',
      system: 'Sistema',
      light: 'Claro',
      dark: 'Oscuro',
      language: 'Idioma',
      chatColor: 'Color de Burbuja de Chat',
      saveChanges: 'Guardar Cambios',
      saving: 'Guardando...',
      profileUpdated: 'Perfil actualizado exitosamente',
      preferencesUpdated: 'Preferencias actualizadas exitosamente'
    },
    profile: {
      username: 'Nombre de Usuario',
      displayName: 'Nombre para Mostrar',
      uploadPicture: 'Haz clic para subir una nueva foto de perfil',
      enterUsername: 'Ingresa tu nombre de usuario',
      enterDisplayName: 'Ingresa tu nombre para mostrar',
      profilePicture: 'Foto de Perfil',
      changePassword: 'Cambiar Contraseña',
      currentPassword: 'Contraseña Actual',
      newPassword: 'Nueva Contraseña',
      confirmPassword: 'Confirmar Contraseña',
      passwordChanged: 'Contraseña actualizada exitosamente',
      passwordMismatch: 'Las nuevas contraseñas no coinciden',
      invalidCurrentPassword: 'La contraseña actual es incorrecta'
    },
    chat: {
      sendMessage: 'Enviar mensaje',
      typeMessage: 'Escribe tu mensaje...',
      loading: 'Cargando mensajes...',
      noMessages: '¡No hay mensajes aún. ¡Inicia una conversación!',
      clearChat: 'Limpiar chat',
      confirmClear: '¿Estás seguro de que quieres borrar esta conversación? Esta acción no se puede deshacer.',
      chatCleared: 'Historial de chat borrado exitosamente',
      noCharacterSelected: 'No hay personaje seleccionado. Por favor, selecciona un personaje primero.',
      messageTooLong: 'El mensaje es demasiado largo. Por favor, mantenlo por debajo de 2000 caracteres.',
      addReaction: 'Añadir reacción'
    },
    character: {
      new: 'Nuevo Personaje',
      edit: 'Editar Personaje',
      details: 'Detalles del Personaje',
      personality: {
        title: 'Configuración de Personalidad',
        traits: 'Personalidad',
        traitsPlaceholder: "Describe los rasgos de personalidad y comportamientos principales del personaje...",
        traitsHelp: "Define los rasgos de personalidad, manierismos y patrones generales de comportamiento del personaje.",
        backstory: 'Historia',
        backstoryPlaceholder: "Escribe la historia y antecedentes del personaje...",
        backstoryHelp: "Proporciona información de fondo que da forma a la perspectiva y respuestas del personaje.",
        systemPrompt: 'Prompt del Sistema',
        systemPromptPlaceholder: 'Define la personalidad y el rol principal de tu personaje...',
        systemPromptHelp: "Este es el mensaje inicial del sistema que define la personalidad y el comportamiento principal de tu personaje.",
        customInstructions: 'Instrucciones Personalizadas',
        customInstructionsPlaceholder: 'Agrega instrucciones o pautas adicionales...',
        customInstructionsHelp: 'Instrucciones adicionales que se agregarán al mensaje del sistema para personalizar aún más el comportamiento.'
      },
      fields: {
        name: 'Nombre',
        namePlaceholder: 'Nombre del personaje',
        age: 'Edad',
        agePlaceholder: 'Edad',
        gender: 'Género',
        genderPlaceholder: 'Género',
        race: 'Raza',
        racePlaceholder: 'Raza/Especie',
        occupation: 'Ocupación',
        occupationPlaceholder: "Rol del personaje",
        likes: 'Gustos',
        likesPlaceholder: 'Ingresa gustos separados por comas (ej: gatos, lectura, café)',
        dislikes: 'Disgustos',
        dislikesPlaceholder: 'Ingresa disgustos separados por comas (ej: lluvia, ruidos fuertes, arañas)',
        avatar: 'URL de Avatar o Subir',
        avatarPlaceholder: 'https://ejemplo.com/avatar.png',
        fullImage: 'URL de Imagen Completa o Subir',
        fullImagePlaceholder: 'https://ejemplo.com/completa.png'
      },
      actions: {
        resetDefaults: 'Restablecer Valores',
        upload: 'Subir',
        save: 'Guardar',
        cancel: 'Cancelar'
      },
      metadata: {
        yearsOld: 'años'
      },
      delete: 'Eliminar personaje',
      deleted: 'Personaje eliminado.',
      deleteFailed: 'No se pudo eliminar el personaje.',
      confirmDelete: '¿Estás seguro de que deseas eliminar este personaje? Esto no se puede deshacer.'
    },
    sidebar: {
      characters: 'Personajes',
      settings: 'Configuración',
      newCharacter: 'Nuevo personaje',
      search: 'Buscar personajes...'
    },
    common: {
      create: 'Crear',
      delete: 'Eliminar',
      cancel: 'Cancelar',
      save: 'Guardar',
      edit: 'Editar',
      loading: 'Cargando...',
      error: 'Algo salió mal',
      refresh: 'Actualizar Página',
      goHome: 'Ir al Inicio',
      logout: 'Cerrar Sesión'
    },
    errors: {
      required: 'Este campo es obligatorio',
      invalidEmail: 'Correo electrónico inválido',
      passwordMismatch: 'Las contraseñas no coinciden',
      invalidCredentials: 'Correo o contraseña inválidos',
      serverError: 'Ocurrió un error en el servidor',
      unexpectedError: 'Lo sentimos, pero algo inesperado sucedió. Por favor, intenta refrescar la página.'
    },
    admin: {
      title: 'Panel de administración',
      searchUsers: 'Buscar usuarios...',
      backToHome: 'Volver al inicio',
      systemOverview: 'Resumen del sistema',
      users: 'Usuarios',
      messages: 'Mensajes',
      characters: 'Personajes',
      stats: 'Estadísticas',
      recentActivity: 'Actividad reciente',
      role: 'Rol',
      status: 'Estado',
      joined: 'Registrado',
      lastLogin: 'Último acceso',
      totalMessages: 'Mensajes totales',
      charactersCreated: 'Personajes creados',
      activeSessions: 'Sesiones activas',
      blocked: 'Bloqueado',
      online: 'En línea',
      offline: 'Desconectado',
      resetPassword: 'Restablecer contraseña',
      blockUser: 'Bloquear usuario',
      unblockUser: 'Desbloquear usuario',
      deleteUser: 'Eliminar usuario',
      activityStats: 'Estadísticas de actividad',
      basicInfo: 'Información básica',
      activity: 'Actividad',
      systemStats: 'Estadísticas del sistema',
      createdToday: 'Creado hoy',
      avgPerUser: 'Prom. por usuario',
      newToday: 'Nuevo hoy',
      activeNow: 'Activos ahora',
      avgMessagesPerUser: 'Prom. por usuario',
      systemActivity: 'Actividad reciente del sistema',
      removeDuplicatesAll: 'Eliminar personajes Nelliel duplicados (Todos)',
      removeDuplicatesUser: 'Eliminar personajes Nelliel duplicados (Usuario)',
      duplicatesRemoved: 'Se eliminaron %{count} personajes Nelliel duplicados.',
      noDuplicatesFound: 'No se encontraron personajes Nelliel duplicados.',
      duplicateCleanupFailed: 'No se pudo limpiar duplicados: %{error}',
      SUPER_ADMIN: 'Super Admin',
      USER: 'Usuario',
      MODERATOR: 'Moderador',
      ADMIN: 'Administrador'
    }
  }
};

const LanguageContext = createContext();

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'en';
  });

  // Update language in localStorage when it changes
  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
} 