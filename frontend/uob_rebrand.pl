#!/usr/bin/perl
use strict;
use warnings;

# Ordered list of literal replacements. Longer gradient strings MUST come
# before the individual hex tokens they contain.
my @rules = (
  ['linear-gradient(100deg,#4f46e5,#8b5cf6,#d946ef)', 'linear-gradient(120deg, #001A3F 0%, #002E5D 45%, #005EB8 100%)'],
  ['linear-gradient(90deg,#4f46e5,#7c3aed)', 'linear-gradient(90deg, #005EB8 0%, #0072CE 100%)'],
  ['linear-gradient(90deg, #4f46e5, #7c3aed)', 'linear-gradient(90deg, #005EB8 0%, #0072CE 100%)'],
  ['#4f46e5', '#005EB8'],
  ['#7c3aed', '#0072CE'],
  ['#8b5cf6', '#0072CE'],
  ['#d946ef', '#00A3E0'],
  ['#ede9fe', '#e6f0fa'],
  ['#eef2ff', '#e6f0fa'],
  ['#f1effe', '#e6f0fa'],
  ['#faf7ff', '#f5f9fd'],
  ['#e9d5ff', '#b3d1ec'],
  ['#c7d2fe', '#b3d1ec'],
  ['rgba(238,242,255,0.9)', 'rgba(230,240,250,0.9)'],
  ['rgba(79,70,229,', 'rgba(0,94,184,'],
);

my $grand_total = 0;
for my $file (@ARGV) {
  local $/;
  open(my $fh, '<', $file) or die "cannot open $file: $!";
  my $content = <$fh>;
  close($fh);

  my $file_total = 0;
  for my $rule (@rules) {
    my ($from, $to) = @$rule;
    my $n = () = $content =~ /\Q$from\E/g;
    if ($n > 0) {
      $content =~ s/\Q$from\E/$to/g;
      $file_total += $n;
    }
  }

  if ($file_total > 0) {
    open(my $out, '>', $file) or die "cannot write $file: $!";
    print $out $content;
    close($out);
    print "$file_total\t$file\n";
    $grand_total += $file_total;
  }
}
print "TOTAL\t$grand_total\n";
