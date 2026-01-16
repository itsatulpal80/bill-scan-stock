import { useState } from 'react';
import { Store, FileText, Users, Database, ChevronRight, Save, UserCheck } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, switchRole } = useAuth();
  const { toast } = useToast();
  
  const [shopDetails, setShopDetails] = useState({
    name: 'Krishna Medical Store',
    address: '123 Main Road, Sector 15, Noida, UP - 201301',
    phone: '9876543210',
    gstNumber: '09AABCU9603R1ZM',
    licenseNumber: 'UP/NOI/20-21/1234',
  });

  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'Shop details updated successfully',
    });
  };

  const settingsItems = [
    { icon: Users, label: 'Staff Management', description: 'Add or manage staff accounts' },
    { icon: Database, label: 'Backup & Sync', description: 'Cloud backup settings' },
    { icon: FileText, label: 'Print Settings', description: 'Configure bill printing' },
  ];

  return (
    <AppLayout title="Settings">
      <div className="p-4 space-y-6">
        {/* Role Switcher (Demo) */}
        <div className="bg-secondary rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-2">Demo: Switch Role</p>
          <div className="flex gap-2">
            <button
              onClick={() => switchRole('owner')}
              className={cn(
                'flex-1 py-2 rounded-lg font-medium text-sm touch-feedback',
                user?.role === 'owner' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card border border-border'
              )}
            >
              <UserCheck className="w-4 h-4 inline mr-2" />
              Owner
            </button>
            <button
              onClick={() => switchRole('staff')}
              className={cn(
                'flex-1 py-2 rounded-lg font-medium text-sm touch-feedback',
                user?.role === 'staff' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card border border-border'
              )}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Staff
            </button>
          </div>
        </div>

        {/* Shop Details */}
        <div className="bg-card rounded-xl border border-border p-4 card-elevated">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Shop Details</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Shop Name</label>
              <Input
                value={shopDetails.name}
                onChange={(e) => setShopDetails({ ...shopDetails, name: e.target.value })}
                className="h-12"
              />
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Address</label>
              <Input
                value={shopDetails.address}
                onChange={(e) => setShopDetails({ ...shopDetails, address: e.target.value })}
                className="h-12"
              />
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Phone Number</label>
              <Input
                value={shopDetails.phone}
                onChange={(e) => setShopDetails({ ...shopDetails, phone: e.target.value })}
                className="h-12"
              />
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">GST Number</label>
              <Input
                value={shopDetails.gstNumber}
                onChange={(e) => setShopDetails({ ...shopDetails, gstNumber: e.target.value })}
                className="h-12"
              />
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Drug License Number</label>
              <Input
                value={shopDetails.licenseNumber}
                onChange={(e) => setShopDetails({ ...shopDetails, licenseNumber: e.target.value })}
                className="h-12"
              />
            </div>

            <Button onClick={handleSave} className="w-full h-12 touch-feedback">
              <Save className="w-5 h-5 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Other Settings */}
        <div className="space-y-2">
          {settingsItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="w-full bg-card rounded-xl border border-border p-4 card-elevated flex items-center gap-4 touch-feedback text-left"
              >
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        {/* App Info */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>MedStock Pro v1.0.0</p>
          <p className="mt-1">Made for Indian Pharmacies</p>
        </div>
      </div>
    </AppLayout>
  );
}
