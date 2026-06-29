-- Migración para añadir fecha de habilitación/registro a vehículos y conductores
ALTER TABLE vehicles ADD COLUMN registration_date date;
ALTER TABLE drivers ADD COLUMN admission_date date;

COMMENT ON COLUMN vehicles.registration_date IS 'Fecha en la que el vehículo fue registrado o habilitado oficialmente en la cooperativa';
COMMENT ON COLUMN drivers.admission_date IS 'Fecha de ingreso o admisión formal del conductor a la cooperativa';
