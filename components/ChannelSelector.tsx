'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Hash, Folder, ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface Channel {
  _id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  order: number;
  icon?: string;
  children?: Channel[];
}

interface ChannelSelectorProps {
  projectId: string;
  selectedChannelId: string | null;
  onChannelSelect: (channelId: string, channelName: string) => void;
}

export default function ChannelSelector({
  projectId,
  selectedChannelId,
  onChannelSelect
}: ChannelSelectorProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChannels();
  }, [projectId]);

  useEffect(() => {
    // Find selected channel
    if (selectedChannelId && channels.length > 0) {
      const channel = findChannelById(channels, selectedChannelId);
      setSelectedChannel(channel);
    }
  }, [selectedChannelId, channels]);

  useEffect(() => {
    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/channels`);
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);

        // Si no hay canal seleccionado, seleccionar General por defecto (o el primer canal disponible)
        if (!selectedChannelId && data.channels.length > 0) {
          const generalChannel = findGeneralChannel(data.channels);
          if (generalChannel) {
            onChannelSelect(generalChannel._id, generalChannel.name);
          } else {
            // Si no hay canal General, seleccionar el primer canal disponible
            const firstChannel = findFirstChannel(data.channels);
            if (firstChannel) {
              onChannelSelect(firstChannel._id, firstChannel.name);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const findGeneralChannel = (channelList: Channel[]): Channel | null => {
    for (const channel of channelList) {
      // Buscar canal "General" o "general" (case insensitive)
      if (channel.name.toLowerCase() === 'general' && !channel.parentId) {
        return channel;
      }
      if (channel.children) {
        const found = findGeneralChannel(channel.children);
        if (found) return found;
      }
    }
    return null;
  };

  const findFirstChannel = (channelList: Channel[]): Channel | null => {
    // Retornar el primer canal sin padre (canal raíz)
    for (const channel of channelList) {
      if (!channel.parentId) {
        return channel;
      }
    }
    // Si todos tienen padre, retornar el primero de la lista
    return channelList.length > 0 ? channelList[0] : null;
  };

  const findChannelById = (channelList: Channel[], id: string): Channel | null => {
    for (const channel of channelList) {
      if (channel._id === id) {
        return channel;
      }
      if (channel.children) {
        const found = findChannelById(channel.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const getIconComponent = (iconName: string = 'Hash', size: number = 18) => {
    const Icon = (LucideIcons as any)[iconName] || Hash;
    return <Icon size={size} />;
  };

  const handleSelect = (channel: Channel, parentName?: string) => {
    const displayName = parentName ? `${parentName} → ${channel.name}` : channel.name;
    onChannelSelect(channel._id, displayName);
    setSelectedChannel(channel);
    setIsOpen(false);
  };

  const renderChannelOption = (channel: Channel, parentName?: string) => {
    const hasChildren = channel.children && channel.children.length > 0;
    const displayName = parentName ? `${parentName} → ${channel.name}` : channel.name;

    return (
      <div key={channel._id}>
        <button
          onClick={() => handleSelect(channel, parentName)}
          className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
            selectedChannelId === channel._id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
          }`}
        >
          <div className="text-gray-600 dark:text-gray-400">
            {getIconComponent(channel.icon, 16)}
          </div>
          <span className="flex-1 text-sm text-gray-800 dark:text-gray-100">
            {displayName}
          </span>
          {selectedChannelId === channel._id && (
            <ChevronRight size={14} className="text-blue-600 dark:text-blue-400" />
          )}
        </button>

        {/* Render children (subcanales) */}
        {hasChildren && (
          <div className="ml-6 border-l-2 border-gray-200 dark:border-gray-700">
            {channel.children!.map((child) => renderChannelOption(child, channel.name))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
        Cargando canales...
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Channel Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition min-w-[200px]"
      >
        <div className="text-gray-600 dark:text-gray-400">
          {selectedChannel ? getIconComponent(selectedChannel.icon, 18) : <Hash size={18} />}
        </div>
        <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100 text-left">
          {selectedChannel?.name || 'Seleccionar canal'}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full min-w-[250px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-[400px] overflow-y-auto">
          {channels.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
              No hay canales disponibles
            </div>
          ) : (
            channels.map((channel) => renderChannelOption(channel))
          )}
        </div>
      )}
    </div>
  );
}
