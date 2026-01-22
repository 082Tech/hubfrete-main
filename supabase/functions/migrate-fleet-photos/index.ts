import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Migrate vehicle photos
    const { data: veiculos, error: veiculosError } = await supabase
      .from("veiculos")
      .select("id, placa, foto_url")
      .not("foto_url", "is", null)
      .like("foto_url", "%notas-fiscais%");

    if (veiculosError) throw veiculosError;

    const migratedVehicles = [];
    
    for (const veiculo of veiculos || []) {
      try {
        // Extract original file path
        const urlParts = veiculo.foto_url.split("/notas-fiscais/");
        if (urlParts.length < 2) continue;
        
        const originalPath = urlParts[1];
        
        // Download file from old bucket
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("notas-fiscais")
          .download(originalPath);
        
        if (downloadError) {
          console.error(`Failed to download ${originalPath}:`, downloadError);
          continue;
        }

        // Upload to new bucket
        const newPath = originalPath; // Keep same structure
        const { error: uploadError } = await supabase.storage
          .from("fotos-frota")
          .upload(newPath, fileData, { upsert: true });

        if (uploadError) {
          console.error(`Failed to upload ${newPath}:`, uploadError);
          continue;
        }

        // Get new public URL
        const { data: urlData } = supabase.storage
          .from("fotos-frota")
          .getPublicUrl(newPath);

        // Update vehicle record
        const { error: updateError } = await supabase
          .from("veiculos")
          .update({ foto_url: urlData.publicUrl })
          .eq("id", veiculo.id);

        if (updateError) {
          console.error(`Failed to update vehicle ${veiculo.id}:`, updateError);
          continue;
        }

        // Delete from old bucket
        await supabase.storage.from("notas-fiscais").remove([originalPath]);

        migratedVehicles.push({ id: veiculo.id, placa: veiculo.placa, newUrl: urlData.publicUrl });
      } catch (err) {
        console.error(`Error migrating vehicle ${veiculo.id}:`, err);
      }
    }

    // Migrate carroceria photos
    const { data: carrocerias, error: carroceriasError } = await supabase
      .from("carrocerias")
      .select("id, placa, foto_url")
      .not("foto_url", "is", null)
      .like("foto_url", "%notas-fiscais%");

    if (carroceriasError) throw carroceriasError;

    const migratedCarrocerias = [];

    for (const carroceria of carrocerias || []) {
      try {
        const urlParts = carroceria.foto_url.split("/notas-fiscais/");
        if (urlParts.length < 2) continue;
        
        const originalPath = urlParts[1];
        
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("notas-fiscais")
          .download(originalPath);
        
        if (downloadError) {
          console.error(`Failed to download ${originalPath}:`, downloadError);
          continue;
        }

        const newPath = originalPath;
        const { error: uploadError } = await supabase.storage
          .from("fotos-frota")
          .upload(newPath, fileData, { upsert: true });

        if (uploadError) {
          console.error(`Failed to upload ${newPath}:`, uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("fotos-frota")
          .getPublicUrl(newPath);

        const { error: updateError } = await supabase
          .from("carrocerias")
          .update({ foto_url: urlData.publicUrl })
          .eq("id", carroceria.id);

        if (updateError) {
          console.error(`Failed to update carroceria ${carroceria.id}:`, updateError);
          continue;
        }

        await supabase.storage.from("notas-fiscais").remove([originalPath]);

        migratedCarrocerias.push({ id: carroceria.id, placa: carroceria.placa, newUrl: urlData.publicUrl });
      } catch (err) {
        console.error(`Error migrating carroceria ${carroceria.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        migratedVehicles,
        migratedCarrocerias,
        totalVehicles: migratedVehicles.length,
        totalCarrocerias: migratedCarrocerias.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Migration error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
