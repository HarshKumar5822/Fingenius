import { User as UserIcon, Lock, DollarSign, Moon, X, Eye, EyeOff, Check } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { authService, User } from '../services/api';

type Setting =
  | { id: string; label: string; type: 'text' | 'email' | 'tel'; value: string }
  | { id: string; label: string; type: 'toggle'; value: boolean }
  | { id: string; label: string; type: 'button'; value: string }
  | { id: string; label: string; type: 'select'; value: string; options: string[] };

type Section = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  settings: Setting[];
};

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [sections, setSections] = useState<Section[]>([
    {
      title: 'Profile Settings',
      icon: UserIcon,
      settings: [
        {
          id: 'name',
          label: 'Full Name',
          type: 'text',
          value: '',
        },
        {
          id: 'email',
          label: 'Email Address',
          type: 'email',
          value: '',
        },
        {
          id: 'phone',
          label: 'Phone Number',
          type: 'tel',
          value: '',
        },
      ],
    },
    {
      title: 'Security',
      icon: Lock,
      settings: [
        {
          id: 'password',
          label: 'Change Password',
          type: 'button',
          value: 'Change',
        },
        {
          id: '2fa',
          label: 'Two-Factor Authentication',
          type: 'toggle',
          value: false,
        },
      ],
    },
    {
      title: 'Preferences',
      icon: Moon,
      settings: [
        {
          id: 'theme',
          label: 'Dark Mode',
          type: 'toggle',
          value: false,
        },
        {
          id: 'notifications',
          label: 'Email Notifications',
          type: 'toggle',
          value: true,
        },
      ],
    },
    {
      title: 'Currency',
      icon: DollarSign,
      settings: [
        {
          id: 'currency',
          label: 'Default Currency',
          type: 'select',
          value: 'INR',
          options: ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD'],
        },
      ],
    },
  ]);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Fetch live user data and initialize settings
  const loadUserProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const user = await authService.getProfile();
      setUserProfile(user);

      const savedTheme = localStorage.getItem('theme') || user.settings?.theme || 'light';
      const isDark = savedTheme === 'dark';
      document.documentElement.classList.toggle('dark', isDark);

      setSections([
        {
          title: 'Profile Settings',
          icon: UserIcon,
          settings: [
            {
              id: 'name',
              label: 'Full Name',
              type: 'text',
              value: user.name || '',
            },
            {
              id: 'email',
              label: 'Email Address',
              type: 'email',
              value: user.email || '',
            },
            {
              id: 'phone',
              label: 'Phone Number',
              type: 'tel',
              value: user.phone || '',
            },
          ],
        },
        {
          title: 'Security',
          icon: Lock,
          settings: [
            {
              id: 'password',
              label: 'Change Password',
              type: 'button',
              value: 'Change',
            },
            {
              id: '2fa',
              label: 'Two-Factor Authentication',
              type: 'toggle',
              value: false,
            },
          ],
        },
        {
          title: 'Preferences',
          icon: Moon,
          settings: [
            {
              id: 'theme',
              label: 'Dark Mode',
              type: 'toggle',
              value: isDark,
            },
            {
              id: 'notifications',
              label: 'Email Notifications',
              type: 'toggle',
              value: user.settings?.notifications ?? true,
            },
          ],
        },
        {
          title: 'Currency',
          icon: DollarSign,
          settings: [
            {
              id: 'currency',
              label: 'Default Currency',
              type: 'select',
              value: user.settings?.currency || 'INR',
              options: ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD'],
            },
          ],
        },
      ]);
    } catch (err) {
      console.error('Error loading user profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const handleSettingChange = (sectionIndex: number, settingIndex: number, value: string | boolean) => {
    const newSections = [...sections];
    const setting = newSections[sectionIndex].settings[settingIndex];

    if (
      (setting.type === 'text' || setting.type === 'email' || setting.type === 'tel' || setting.type === 'select') &&
      typeof value === 'string'
    ) {
      setting.value = value;
    } else if (setting.type === 'toggle' && typeof value === 'boolean') {
      setting.value = value;

      // Handle Dark Mode toggle live
      if (setting.id === 'theme') {
        document.documentElement.classList.toggle('dark', value);
        localStorage.setItem('theme', value ? 'dark' : 'light');
      }
    }

    setSections(newSections);
    setHasChanges(true);
  };

  const handlePasswordChange = (field: keyof PasswordForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    setPasswordError(null);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setShowPasswordModal(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    alert('Password updated successfully!');
  };

  const handleSaveChanges = async () => {
    setSaveStatus('saving');
    try {
      // Find updated values
      const profileSection = sections.find((s) => s.title === 'Profile Settings');
      const prefsSection = sections.find((s) => s.title === 'Preferences');
      const currencySection = sections.find((s) => s.title === 'Currency');

      const nameSetting = profileSection?.settings.find((s) => s.id === 'name');
      const emailSetting = profileSection?.settings.find((s) => s.id === 'email');
      const phoneSetting = profileSection?.settings.find((s) => s.id === 'phone');

      const themeSetting = prefsSection?.settings.find((s) => s.id === 'theme');
      const notifSetting = prefsSection?.settings.find((s) => s.id === 'notifications');
      const currencySetting = currencySection?.settings.find((s) => s.id === 'currency');

      const updatedName = typeof nameSetting?.value === 'string' ? nameSetting.value : userProfile?.name;
      const updatedEmail = typeof emailSetting?.value === 'string' ? emailSetting.value : userProfile?.email;
      const updatedPhone = typeof phoneSetting?.value === 'string' ? phoneSetting.value : '';
      const isDark = typeof themeSetting?.value === 'boolean' ? themeSetting.value : false;
      const notifications = typeof notifSetting?.value === 'boolean' ? notifSetting.value : true;
      const currency = typeof currencySetting?.value === 'string' ? currencySetting.value : 'INR';

      // Live Dark Mode toggle
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem('theme', isDark ? 'dark' : 'light');

      await authService.updateProfile({
        name: updatedName,
        email: updatedEmail,
        phone: updatedPhone,
        settings: {
          theme: isDark ? 'dark' : 'light',
          notifications,
          currency,
        },
      });

      setSaveStatus('success');
      setHasChanges(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving profile changes:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleCancel = () => {
    loadUserProfile();
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your registration profile, security, and app dark mode preferences
          </p>
        </div>

        {saveStatus === 'success' && (
          <div className="text-green-600 text-sm font-semibold flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
            <Check className="w-4 h-4" />
            <span>Profile saved successfully!</span>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="text-red-600 text-sm font-medium bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
            <span>Error saving profile changes.</span>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {sections.map((section, sectionIndex) => (
          <div key={section.title} className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <div className="p-6 border-b flex items-center gap-2">
              <section.icon className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
            </div>
            <div className="divide-y">
              {section.settings.map((setting, settingIndex) => (
                <div key={setting.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <h3 className="font-medium text-gray-800 text-sm">{setting.label}</h3>
                  </div>
                  <div>
                    {(setting.type === 'text' || setting.type === 'email' || setting.type === 'tel') && (
                      <input
                        type={setting.type}
                        value={setting.value}
                        onChange={(e) => handleSettingChange(sectionIndex, settingIndex, e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-w-[240px]"
                        placeholder={`Enter ${setting.label.toLowerCase()}`}
                      />
                    )}
                    {setting.type === 'toggle' && (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={setting.value}
                          onChange={(e) => handleSettingChange(sectionIndex, settingIndex, e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    )}
                    {setting.type === 'select' && (
                      <select
                        value={setting.value}
                        onChange={(e) => handleSettingChange(sectionIndex, settingIndex, e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        {setting.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                    {setting.type === 'button' && (
                      <button
                        onClick={() => setShowPasswordModal(true)}
                        className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
                      >
                        {setting.value}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={handleCancel}
          disabled={!hasChanges || saveStatus === 'saving'}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveChanges}
          disabled={!hasChanges || saveStatus === 'saving'}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 cursor-pointer shadow"
        >
          {saveStatus === 'saving' ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passwordError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                  {passwordError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange('currentPassword')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange('newPassword')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange('confirmPassword')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}