using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<VehiclePart> VehicleParts => Set<VehiclePart>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<VehiclePart>(entity =>
        {
            entity.HasKey(v => v.Id);
            entity.Property(v => v.Name).HasMaxLength(200).IsRequired();
            entity.Property(v => v.PartNumber).HasMaxLength(100).IsRequired();
            entity.Property(v => v.Price).HasColumnType("numeric(12,2)");
            entity.Property(v => v.RoleVisibility).HasMaxLength(50);
        });
    }
}
