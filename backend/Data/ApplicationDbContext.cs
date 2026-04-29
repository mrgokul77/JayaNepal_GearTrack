using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<VehiclePart> VehicleParts => Set<VehiclePart>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.FullName).HasMaxLength(150).IsRequired();
            entity.Property(u => u.Email).HasMaxLength(150).IsRequired();
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Role).HasMaxLength(30).IsRequired();
            entity.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.FullName).HasMaxLength(150).IsRequired();
            entity.Property(c => c.Email).HasMaxLength(150).IsRequired();
            entity.Property(c => c.Phone).HasMaxLength(30);
            entity.Property(c => c.Address).HasMaxLength(300);

            entity.HasOne(c => c.User)
                .WithOne(u => u.CustomerProfile)
                .HasForeignKey<Customer>(c => c.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

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
