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
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<VehiclePart> VehicleParts => Set<VehiclePart>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<Staff> StaffMembers => Set<Staff>();
    public DbSet<PurchaseInvoice> PurchaseInvoices => Set<PurchaseInvoice>();
    public DbSet<PurchaseInvoiceItem> PurchaseInvoiceItems => Set<PurchaseInvoiceItem>();
    public DbSet<SalesInvoice> SalesInvoices => Set<SalesInvoice>();
    public DbSet<SalesInvoiceItem> SalesInvoiceItems => Set<SalesInvoiceItem>();
    public DbSet<Part> Parts => Set<Part>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<PartRequest> PartRequests => Set<PartRequest>();
    public DbSet<ServiceReview> ServiceReviews => Set<ServiceReview>();
    public DbSet<Notification> Notifications => Set<Notification>();

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

        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.HasKey(v => v.Id);
            entity.Property(v => v.VehicleNumber).HasMaxLength(50).IsRequired();
            entity.Property(v => v.Brand).HasMaxLength(100).IsRequired();
            entity.Property(v => v.Model).HasMaxLength(100).IsRequired();

            entity.HasOne(v => v.Customer)
                .WithMany(c => c.Vehicles)
                .HasForeignKey(v => v.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<VehiclePart>(entity =>
        {
            entity.HasKey(v => v.Id);
            entity.Property(v => v.Name).HasMaxLength(200).IsRequired();
            entity.Property(v => v.Description).HasMaxLength(500);
            entity.Property(v => v.Price).HasColumnType("numeric(12,2)");
            entity.Property(v => v.StockQuantity).IsRequired();

            entity.HasOne(v => v.Vendor)
                .WithMany(vn => vn.VehicleParts)
                .HasForeignKey(v => v.VendorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Vendor>(entity =>
        {
            entity.HasKey(v => v.Id);
            entity.Property(v => v.Name).HasMaxLength(150).IsRequired();
            entity.Property(v => v.Phone).HasMaxLength(30);
            entity.Property(v => v.Email).HasMaxLength(150);
            entity.Property(v => v.Address).HasMaxLength(300);
            entity.Property(v => v.CreatedAt).IsRequired();
        });

        modelBuilder.Entity<Staff>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.FullName).HasMaxLength(150).IsRequired();
            entity.Property(s => s.Email).HasMaxLength(150).IsRequired();
            entity.Property(s => s.Phone).HasMaxLength(30);
            entity.Property(s => s.Role).HasMaxLength(30).IsRequired();

            entity.HasOne(s => s.User)
                .WithOne(u => u.StaffProfile)
                .HasForeignKey<Staff>(s => s.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PurchaseInvoice>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.TotalAmount).HasColumnType("numeric(12,2)");

            entity.HasOne(p => p.Vendor)
                .WithMany(v => v.PurchaseInvoices)
                .HasForeignKey(p => p.VendorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(p => p.Admin)
                .WithMany()
                .HasForeignKey(p => p.AdminId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PurchaseInvoiceItem>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.UnitPrice).HasColumnType("numeric(12,2)");

            entity.HasOne(p => p.PurchaseInvoice)
                .WithMany(i => i.Items)
                .HasForeignKey(p => p.PurchaseInvoiceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(p => p.Part)
                .WithMany(pv => pv.PurchaseInvoiceItems)
                .HasForeignKey(p => p.PartId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SalesInvoice>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.TotalAmount).HasColumnType("numeric(12,2)");
            entity.Property(s => s.DiscountApplied).HasColumnType("numeric(12,2)");

            entity.HasOne(s => s.Customer)
                .WithMany(c => c.SalesInvoices)
                .HasForeignKey(s => s.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(s => s.Staff)
                .WithMany(st => st.SalesInvoices)
                .HasForeignKey(s => s.StaffId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SalesInvoiceItem>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.UnitPrice).HasColumnType("numeric(12,2)");

            entity.HasOne(s => s.SalesInvoice)
                .WithMany(i => i.Items)
                .HasForeignKey(s => s.SalesInvoiceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(s => s.Part)
                .WithMany(pv => pv.SalesInvoiceItems)
                .HasForeignKey(s => s.PartId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Part>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).HasMaxLength(200).IsRequired();
            entity.Property(p => p.Price).HasColumnType("numeric(12,2)");
            entity.Property(p => p.StockQuantity).IsRequired();
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.ServiceType).HasMaxLength(150).IsRequired();
            entity.Property(a => a.Status).HasMaxLength(30).IsRequired();
            entity.Property(a => a.Notes).HasMaxLength(1000);
            entity.Property(a => a.CreatedAt).IsRequired();

            entity.HasOne(a => a.Customer)
                .WithMany(c => c.Appointments)
                .HasForeignKey(a => a.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PartRequest>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.PartName).HasMaxLength(200).IsRequired();
            entity.Property(p => p.Description).HasMaxLength(1000);
            entity.Property(p => p.Status).HasMaxLength(30).IsRequired();
            entity.Property(p => p.CreatedAt).IsRequired();

            entity.HasOne(p => p.Customer)
                .WithMany(c => c.PartRequests)
                .HasForeignKey(p => p.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ServiceReview>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Rating).IsRequired();
            entity.Property(s => s.Comment).HasMaxLength(2000);
            entity.Property(s => s.CreatedAt).IsRequired();

            entity.HasOne(s => s.Customer)
                .WithMany(c => c.ServiceReviews)
                .HasForeignKey(s => s.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(s => s.Appointment)
                .WithMany()
                .HasForeignKey(s => s.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(n => n.Id);
            entity.Property(n => n.Title).HasMaxLength(200).IsRequired();
            entity.Property(n => n.Message).HasMaxLength(1000).IsRequired();
            entity.Property(n => n.Type).HasMaxLength(50).IsRequired();
            entity.Property(n => n.CreatedAt).IsRequired();

            entity.HasOne(n => n.Admin)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.AdminId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(n => n.VehiclePart)
                .WithMany()
                .HasForeignKey(n => n.VehiclePartId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
