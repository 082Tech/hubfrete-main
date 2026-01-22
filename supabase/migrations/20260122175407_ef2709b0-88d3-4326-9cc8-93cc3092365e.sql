-- Add heading column to store compass direction (0-360 degrees)
ALTER TABLE "localizações" 
ADD COLUMN IF NOT EXISTS "heading" numeric DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN "localizações"."heading" IS 'Compass heading in degrees (0-360). 0=North, 90=East, 180=South, 270=West';